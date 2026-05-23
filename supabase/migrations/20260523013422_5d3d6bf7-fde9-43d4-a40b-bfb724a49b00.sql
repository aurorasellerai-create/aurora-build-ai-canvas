
REVOKE EXECUTE ON FUNCTION public.mark_stalled_conversion_jobs(interval) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_signing_timeout_jobs(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_stalled_conversion_jobs(interval) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_signing_timeout_jobs(interval) TO service_role;
