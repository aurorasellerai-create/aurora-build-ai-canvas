-- Hardening: revoke EXECUTE from public/anon/authenticated on internal SECURITY DEFINER
-- functions that should only be invoked by service_role, triggers, or pg_cron.

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'public.check_login_rate_limit(text)',
    'public.check_ip_rate_limit(text)',
    'public.record_login_attempt(text, boolean)',
    'public.cleanup_old_login_attempts()',
    'public.cleanup_old_security_data()',
    'public.cleanup_webhook_dedupe()',
    'public.is_known_admin_ip(uuid, text)',
    'public.expire_trials()',
    'public.mark_stale_conversion_jobs_as_timeout(interval)',
    'public.process_referral_rewards(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', fn);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END$$;

-- Triggers run with the function's definer privileges regardless of caller grants,
-- but we still tighten public-facing grants for the trigger helpers.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_assign_admin_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Ensure client-callable SECURITY DEFINER helpers keep working:
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_privileged(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_build(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_security_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, text, text) TO authenticated;
