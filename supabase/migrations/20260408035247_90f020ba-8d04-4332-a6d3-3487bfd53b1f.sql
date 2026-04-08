
-- Remove realtime publication for sensitive tables (correct syntax)
ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_purchases;
ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_usage;

-- Explicit deny for anon on system_logs
CREATE POLICY "No anonymous access to system logs"
ON public.system_logs
FOR SELECT
TO anon
USING (false);
