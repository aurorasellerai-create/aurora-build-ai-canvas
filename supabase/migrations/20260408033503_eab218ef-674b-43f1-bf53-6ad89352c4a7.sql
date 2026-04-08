-- Drop the existing overly permissive UPDATE policy on profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restricted UPDATE policy: users can only update safe fields
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
);

-- Drop the existing referral INSERT policy that allows forging
DROP POLICY IF EXISTS "Authenticated users can be referred" ON public.referrals;

-- Referrals should only be created by backend/triggers, not directly by users
-- No INSERT policy = no direct user inserts (service role and triggers still work)