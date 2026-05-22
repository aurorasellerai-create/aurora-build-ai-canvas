
-- Revoke EXECUTE from PUBLIC and anon on SECURITY DEFINER functions exposed in public schema.
-- Grant to authenticated where appropriate; keep service_role implicit.

DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema, p.proname AS name,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname IN (
        'check_login_rate_limit',
        'cleanup_old_login_attempts',
        'has_role',
        'auto_assign_admin_role',
        'acknowledge_security_alert',
        'cleanup_old_security_data',
        'is_known_admin_ip',
        'check_ip_rate_limit',
        'is_privileged',
        'check_and_increment_build',
        'record_login_attempt',
        'consume_credits',
        'handle_new_user',
        'cleanup_webhook_dedupe',
        'mark_stale_conversion_jobs_as_timeout',
        'process_referral_rewards',
        'log_admin_action',
        'expire_trials'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM PUBLIC', fn.schema, fn.name, fn.args);
    EXECUTE format('REVOKE ALL ON FUNCTION %I.%I(%s) FROM anon', fn.schema, fn.name, fn.args);
  END LOOP;
END$$;

-- Grant EXECUTE to authenticated for functions intentionally callable by signed-in users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_build(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_security_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, text, text) TO authenticated;
