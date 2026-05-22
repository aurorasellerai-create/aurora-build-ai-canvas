-- Expand conversion_jobs into a real build state machine with audit fields
ALTER TABLE public.conversion_jobs
  DROP CONSTRAINT IF EXISTS conversion_jobs_status_check;

UPDATE public.conversion_jobs
SET status = CASE
  WHEN status = 'pending' THEN 'queued'
  WHEN status = 'done' THEN 'completed'
  WHEN status = 'error' THEN 'failed'
  WHEN status = 'processing' AND updated_at < now() - interval '10 minutes' THEN 'timeout'
  ELSE status
END,
error_message = CASE
  WHEN status = 'processing' AND updated_at < now() - interval '10 minutes'
    THEN COALESCE(error_message, 'Build excedeu o tempo máximo de processamento e foi finalizado automaticamente.')
  ELSE error_message
END,
step_label = CASE
  WHEN status = 'processing' AND updated_at < now() - interval '10 minutes'
    THEN COALESCE(step_label, 'Timeout automático')
  ELSE step_label
END;

ALTER TABLE public.conversion_jobs
  ADD CONSTRAINT conversion_jobs_status_check CHECK (
    status IN (
      'queued',
      'preparing',
      'installing_dependencies',
      'running_gradle',
      'signing',
      'optimizing',
      'uploading',
      'finalizing',
      'completed',
      'failed',
      'timeout',
      'cancelled',
      'processing', -- backward compatibility only; new code must not write this state
      'pending',
      'done',
      'error'
    )
  );

ALTER TABLE public.conversion_jobs
  ADD COLUMN IF NOT EXISTS build_stage text,
  ADD COLUMN IF NOT EXISTS final_stage text,
  ADD COLUMN IF NOT EXISTS stdout_log text,
  ADD COLUMN IF NOT EXISTS stderr_log text,
  ADD COLUMN IF NOT EXISTS exit_code integer,
  ADD COLUMN IF NOT EXISTS started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS finished_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS timeout_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS watchdog_reason text,
  ADD COLUMN IF NOT EXISTS last_log text,
  ADD COLUMN IF NOT EXISTS recovery_diagnosis jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status_updated_at
  ON public.conversion_jobs (status, updated_at);

CREATE OR REPLACE FUNCTION public.mark_stale_conversion_jobs_as_timeout(_max_age interval DEFAULT interval '10 minutes')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer;
BEGIN
  UPDATE public.conversion_jobs
  SET
    status = 'timeout',
    progress = LEAST(COALESCE(progress, 0), 99),
    error_message = COALESCE(error_message, 'Build excedeu o tempo máximo de processamento.'),
    watchdog_reason = COALESCE(watchdog_reason, 'Timeout watchdog: sem atualização dentro do limite operacional.'),
    timeout_at = COALESCE(timeout_at, now()),
    finished_at = COALESCE(finished_at, now()),
    final_stage = COALESCE(final_stage, build_stage, step_label, 'unknown'),
    last_log = COALESCE(last_log, stderr_log, stdout_log, step_label),
    processing_time_ms = COALESCE(processing_time_ms, GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(started_at, created_at))) * 1000)::integer)),
    updated_at = now()
  WHERE status IN ('queued', 'preparing', 'installing_dependencies', 'running_gradle', 'signing', 'optimizing', 'uploading', 'finalizing', 'processing', 'pending')
    AND COALESCE(started_at, updated_at, created_at) < now() - _max_age;

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;