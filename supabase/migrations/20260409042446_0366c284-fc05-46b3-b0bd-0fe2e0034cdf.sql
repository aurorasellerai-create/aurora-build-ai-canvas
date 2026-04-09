-- Add cleanup control columns to conversion_jobs
ALTER TABLE public.conversion_jobs
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marked_for_deletion BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMPTZ NULL;

-- Index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_conversion_jobs_cleanup
  ON public.conversion_jobs (marked_for_deletion, deletion_scheduled_at)
  WHERE marked_for_deletion = true;