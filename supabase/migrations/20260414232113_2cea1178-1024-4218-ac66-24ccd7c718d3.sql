
-- 1. Fix profiles UPDATE policy to also lock tipo_usuario and status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  (auth.uid() = user_id)
  AND (plan = (SELECT p.plan FROM profiles p WHERE p.user_id = auth.uid()))
  AND (credits_balance = (SELECT p.credits_balance FROM profiles p WHERE p.user_id = auth.uid()))
  AND (ai_credits = (SELECT p.ai_credits FROM profiles p WHERE p.user_id = auth.uid()))
  AND (bonus_builds = (SELECT p.bonus_builds FROM profiles p WHERE p.user_id = auth.uid()))
  AND (NOT (subscription_status IS DISTINCT FROM (SELECT p.subscription_status FROM profiles p WHERE p.user_id = auth.uid())))
  AND (NOT (payment_date IS DISTINCT FROM (SELECT p.payment_date FROM profiles p WHERE p.user_id = auth.uid())))
  AND (daily_builds_count = (SELECT p.daily_builds_count FROM profiles p WHERE p.user_id = auth.uid()))
  AND (last_build_date = (SELECT p.last_build_date FROM profiles p WHERE p.user_id = auth.uid()))
  AND (NOT (referral_code IS DISTINCT FROM (SELECT p.referral_code FROM profiles p WHERE p.user_id = auth.uid())))
  AND (tipo_usuario = (SELECT p.tipo_usuario FROM profiles p WHERE p.user_id = auth.uid()))
  AND (status = (SELECT p.status FROM profiles p WHERE p.user_id = auth.uid()))
  AND (NOT (teste_expira_em IS DISTINCT FROM (SELECT p.teste_expira_em FROM profiles p WHERE p.user_id = auth.uid())))
);

-- 2. Fix aab-files storage SELECT policy to enforce ownership
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read aab-files" ON storage.objects;
DROP POLICY IF EXISTS "aab-files SELECT policy" ON storage.objects;

-- Drop any existing SELECT policies on aab-files bucket
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND cmd = 'SELECT'
    AND qual::text LIKE '%aab-files%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can read own aab-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'aab-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
