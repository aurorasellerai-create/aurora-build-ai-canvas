
ALTER TABLE public.conversion_jobs
  ADD COLUMN IF NOT EXISTS last_heartbeat timestamptz,
  ADD COLUMN IF NOT EXISTS heartbeat_stage text,
  ADD COLUMN IF NOT EXISTS heartbeat_progress integer,
  ADD COLUMN IF NOT EXISTS signing_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS upload_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS artifact_verified boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS conversion_jobs_status_heartbeat_idx
  ON public.conversion_jobs (status, last_heartbeat);

CREATE INDEX IF NOT EXISTS conversion_jobs_signing_started_idx
  ON public.conversion_jobs (build_stage, signing_started_at);

-- Mark jobs as 'stalled' when worker heartbeat is silent
CREATE OR REPLACE FUNCTION public.mark_stalled_conversion_jobs(_heartbeat_max interval DEFAULT '60 seconds')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected integer;
BEGIN
  UPDATE public.conversion_jobs
  SET
    status = 'stalled',
    watchdog_reason = COALESCE(watchdog_reason, '[PIPELINE] Worker heartbeat timeout'),
    last_log = COALESCE(last_log, '') || E'\n[PIPELINE] Worker heartbeat timeout - sem sinal há mais de ' || EXTRACT(EPOCH FROM _heartbeat_max)::int || 's',
    updated_at = now()
  WHERE status IN ('queued','preparing','installing_dependencies','running_gradle','signing','optimizing','uploading','finalizing','processing','pending','recovering')
    AND last_heartbeat IS NOT NULL
    AND last_heartbeat < now() - _heartbeat_max;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$;

-- Mark jobs whose signing step has been running too long
CREATE OR REPLACE FUNCTION public.mark_signing_timeout_jobs(_signing_max interval DEFAULT '180 seconds')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affected integer;
BEGIN
  UPDATE public.conversion_jobs
  SET
    status = 'signing_timeout',
    watchdog_reason = COALESCE(watchdog_reason, '[SIGNING] Signing exceeded ' || EXTRACT(EPOCH FROM _signing_max)::int || 's'),
    last_log = COALESCE(last_log, '') || E'\n[SIGNING] Timeout: assinatura demorou demais',
    finished_at = COALESCE(finished_at, now()),
    final_stage = COALESCE(final_stage, 'signing'),
    updated_at = now()
  WHERE build_stage = 'signing'
    AND signing_started_at IS NOT NULL
    AND signing_started_at < now() - _signing_max
    AND status IN ('signing','processing','running_gradle','optimizing');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$function$;
