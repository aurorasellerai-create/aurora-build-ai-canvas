
-- 1. Drop duplicate storage policies on aab-files (public-role ones)
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;

-- 2. admin_2fa: remove direct SELECT exposure of secret/backup_codes
DROP POLICY IF EXISTS "Admin can view own 2FA status" ON public.admin_2fa;

CREATE OR REPLACE FUNCTION public.get_my_2fa_status()
RETURNS TABLE(enabled boolean, last_used_at timestamptz, backup_codes_remaining integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(a.enabled, false) AS enabled,
    a.last_used_at,
    COALESCE(jsonb_array_length(a.backup_codes), 0) AS backup_codes_remaining
  FROM public.admin_2fa a
  WHERE a.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_2fa_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_2fa_status() TO authenticated;

-- 3. conversion_jobs: revoke column-level SELECT on sensitive diagnostic columns
REVOKE SELECT (stdout_log, stderr_log, last_log, recovery_diagnosis, watchdog_reason)
  ON public.conversion_jobs FROM authenticated, anon;
