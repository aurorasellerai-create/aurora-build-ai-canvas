-- Remove conversion_jobs from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'conversion_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.conversion_jobs;
  END IF;
END $$;