
-- Table to track login attempts for rate limiting
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_hint text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  success boolean NOT NULL DEFAULT false
);

-- Index for fast lookup by email + time
CREATE INDEX idx_login_attempts_email_time ON public.login_attempts (email, attempted_at DESC);

-- Auto-cleanup: delete attempts older than 24h
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '24 hours';
$$;

-- Function to check if login is rate-limited (5 failed attempts in 15 min = blocked)
CREATE OR REPLACE FUNCTION public.check_login_rate_limit(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 5
  FROM public.login_attempts
  WHERE email = lower(p_email)
    AND success = false
    AND attempted_at > now() - interval '15 minutes';
$$;

-- Function to record a login attempt (callable from edge function or client via RPC)
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (email, success)
  VALUES (lower(p_email), p_success);
  
  -- If successful, clear recent failed attempts for this email
  IF p_success THEN
    DELETE FROM public.login_attempts
    WHERE email = lower(p_email) AND success = false;
  END IF;
END;
$$;

-- RLS: no direct access to login_attempts table
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Block all direct access - only via security definer functions
CREATE POLICY "No direct select" ON public.login_attempts FOR SELECT TO authenticated USING (false);
CREATE POLICY "No direct insert" ON public.login_attempts FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No anon select" ON public.login_attempts FOR SELECT TO anon USING (false);
CREATE POLICY "No anon insert" ON public.login_attempts FOR INSERT TO anon WITH CHECK (false);
