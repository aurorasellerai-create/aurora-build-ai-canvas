
ALTER TABLE public.projects        ADD COLUMN IF NOT EXISTS correlation_id text;
ALTER TABLE public.conversion_jobs ADD COLUMN IF NOT EXISTS correlation_id text;

CREATE INDEX IF NOT EXISTS idx_projects_correlation_id
  ON public.projects (correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_correlation_id
  ON public.conversion_jobs (correlation_id) WHERE correlation_id IS NOT NULL;

DROP FUNCTION IF EXISTS public.get_job_diagnostics(uuid);

CREATE FUNCTION public.get_job_diagnostics(_project_id uuid)
RETURNS TABLE(
  build_stage text,
  step_label text,
  status text,
  progress integer,
  watchdog_reason text,
  last_log text,
  stdout_tail text,
  stderr_tail text,
  updated_at timestamptz,
  correlation_id text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_job_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT p.user_id, p.conversion_job_id INTO v_owner, v_job_id
    FROM public.projects p WHERE p.id = _project_id;

  IF v_owner IS NULL THEN RETURN; END IF;
  IF v_owner <> auth.uid() AND NOT public.is_privileged(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  IF v_job_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    cj.build_stage::text,
    cj.step_label::text,
    cj.status::text,
    cj.progress,
    cj.watchdog_reason::text,
    RIGHT(COALESCE(cj.last_log, ''),   4000),
    RIGHT(COALESCE(cj.stdout_log, ''), 4000),
    RIGHT(COALESCE(cj.stderr_log, ''), 4000),
    cj.updated_at,
    cj.correlation_id
  FROM public.conversion_jobs cj
  WHERE cj.id = v_job_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_job_diagnostics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_job_diagnostics(uuid) TO authenticated;
