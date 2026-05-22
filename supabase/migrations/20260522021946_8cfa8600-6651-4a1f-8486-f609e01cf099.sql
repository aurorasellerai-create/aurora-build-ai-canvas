REVOKE ALL ON FUNCTION public.mark_stale_conversion_jobs_as_timeout(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_stale_conversion_jobs_as_timeout(interval) FROM anon;
REVOKE ALL ON FUNCTION public.mark_stale_conversion_jobs_as_timeout(interval) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.mark_stale_conversion_jobs_as_timeout(interval) TO service_role;