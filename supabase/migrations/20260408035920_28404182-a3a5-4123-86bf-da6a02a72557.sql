
-- 1. Restrict projects UPDATE to safe fields only
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

CREATE POLICY "Users can update their own projects"
ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND status = (SELECT p.status FROM public.projects p WHERE p.id = projects.id)
  AND download_url IS NOT DISTINCT FROM (SELECT p.download_url FROM public.projects p WHERE p.id = projects.id)
  AND progress = (SELECT p.progress FROM public.projects p WHERE p.id = projects.id)
  AND error_message IS NOT DISTINCT FROM (SELECT p.error_message FROM public.projects p WHERE p.id = projects.id)
);

-- 2. Referrals: allow referred users to see their own record
CREATE POLICY "Referred users can view their referral"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = referred_id);
