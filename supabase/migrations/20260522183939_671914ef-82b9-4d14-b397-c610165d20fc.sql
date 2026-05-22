-- Revoke EXECUTE from clients on SECURITY DEFINER functions that should only
-- be invoked by edge functions using the service role. Trigger/cron-only
-- functions were already revoked in a previous migration.

REVOKE EXECUTE ON FUNCTION public.check_login_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ip_rate_limit(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_known_admin_ip(uuid, text) FROM PUBLIC, anon, authenticated;