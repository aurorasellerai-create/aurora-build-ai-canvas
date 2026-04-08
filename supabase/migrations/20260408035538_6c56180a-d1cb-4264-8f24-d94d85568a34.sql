
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.user_id = auth.uid())
  AND credits_balance = (SELECT p.credits_balance FROM public.profiles p WHERE p.user_id = auth.uid())
  AND ai_credits = (SELECT p.ai_credits FROM public.profiles p WHERE p.user_id = auth.uid())
  AND bonus_builds = (SELECT p.bonus_builds FROM public.profiles p WHERE p.user_id = auth.uid())
  AND subscription_status IS NOT DISTINCT FROM (SELECT p.subscription_status FROM public.profiles p WHERE p.user_id = auth.uid())
  AND payment_date IS NOT DISTINCT FROM (SELECT p.payment_date FROM public.profiles p WHERE p.user_id = auth.uid())
  AND daily_builds_count = (SELECT p.daily_builds_count FROM public.profiles p WHERE p.user_id = auth.uid())
  AND last_build_date = (SELECT p.last_build_date FROM public.profiles p WHERE p.user_id = auth.uid())
  AND referral_code IS NOT DISTINCT FROM (SELECT p.referral_code FROM public.profiles p WHERE p.user_id = auth.uid())
);
