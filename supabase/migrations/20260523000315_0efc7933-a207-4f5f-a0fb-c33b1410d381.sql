
-- ─────────────────────────────────────────────────────────────────────────────
-- Rate limiting infrastructure (SQL-based sliding window)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rate_limit_hits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_bucket_time_idx
  ON public.rate_limit_hits (bucket_key, hit_at DESC);

-- Lock the table down — only service role (edge functions) may touch it.
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to rate_limit_hits"
  ON public.rate_limit_hits
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Sliding-window rate limit check.
-- Returns: jsonb { allowed: bool, count: int, limit: int, retry_after_seconds: int }
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _bucket_key TEXT,
  _max_hits INTEGER,
  _window_seconds INTEGER
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_oldest TIMESTAMPTZ;
  v_retry INTEGER;
BEGIN
  -- Opportunistic cleanup of old hits for this bucket (cheap, bounded).
  DELETE FROM public.rate_limit_hits
    WHERE bucket_key = _bucket_key
      AND hit_at < now() - make_interval(secs => _window_seconds);

  SELECT COUNT(*), MIN(hit_at)
    INTO v_count, v_oldest
    FROM public.rate_limit_hits
    WHERE bucket_key = _bucket_key
      AND hit_at >= now() - make_interval(secs => _window_seconds);

  IF v_count >= _max_hits THEN
    v_retry := GREATEST(
      1,
      _window_seconds - FLOOR(EXTRACT(EPOCH FROM (now() - v_oldest)))::INTEGER
    );
    RETURN jsonb_build_object(
      'allowed', false,
      'count', v_count,
      'limit', _max_hits,
      'retry_after_seconds', v_retry
    );
  END IF;

  INSERT INTO public.rate_limit_hits (bucket_key) VALUES (_bucket_key);

  RETURN jsonb_build_object(
    'allowed', true,
    'count', v_count + 1,
    'limit', _max_hits,
    'retry_after_seconds', 0
  );
END;
$$;

-- Periodic global cleanup of stale rows (called by cron).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_hits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.rate_limit_hits WHERE hit_at < now() - interval '1 hour';
$$;
