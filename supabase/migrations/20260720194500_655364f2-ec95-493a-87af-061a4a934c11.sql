
-- 1) Add link from projects → conversion_jobs
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS conversion_job_id uuid
    REFERENCES public.conversion_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projects_conversion_job_id
  ON public.projects(conversion_job_id);

-- 2) Mirror function: map conversion_jobs progress into projects
CREATE OR REPLACE FUNCTION public.sync_project_from_conversion_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.project_status;
BEGIN
  v_status := CASE
    WHEN NEW.status IN ('completed','done') THEN 'completed'::public.project_status
    WHEN NEW.status IN ('failed','error','timeout','signing_timeout','cancelled') THEN 'error'::public.project_status
    ELSE 'processing'::public.project_status
  END;

  UPDATE public.projects
     SET status         = v_status,
         progress       = COALESCE(NEW.progress, projects.progress),
         download_url   = COALESCE(NEW.download_url, projects.download_url),
         error_message  = NEW.error_message,
         updated_at     = now()
   WHERE conversion_job_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_from_conversion_job ON public.conversion_jobs;
CREATE TRIGGER trg_sync_project_from_conversion_job
AFTER INSERT OR UPDATE OF status, progress, download_url, error_message
ON public.conversion_jobs
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_from_conversion_job();
