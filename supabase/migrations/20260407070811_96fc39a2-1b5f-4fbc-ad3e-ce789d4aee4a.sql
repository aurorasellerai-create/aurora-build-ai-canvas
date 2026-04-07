
DROP POLICY "System can insert referrals" ON public.referrals;

CREATE POLICY "Authenticated users can be referred"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referred_id);
