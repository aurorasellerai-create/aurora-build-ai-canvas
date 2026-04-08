
-- Block all write operations on user_roles for authenticated users
-- Only service_role and triggers (SECURITY DEFINER) can modify roles

CREATE POLICY "No user insert on roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No user update on roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No user delete on roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (false);

-- Also block anon
CREATE POLICY "No anon insert on roles"
ON public.user_roles
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "No anon update on roles"
ON public.user_roles
FOR UPDATE
TO anon
USING (false)
WITH CHECK (false);

CREATE POLICY "No anon delete on roles"
ON public.user_roles
FOR DELETE
TO anon
USING (false);
