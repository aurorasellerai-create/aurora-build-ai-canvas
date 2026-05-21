
-- 1) Revoke broad EXECUTE from anon/public on all functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 2) Functions safe for any authenticated user (validated internally or read-only role lookups)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged(uuid)                 TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_build(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledge_security_alert(uuid)    TO authenticated; -- validates admin/founder inside
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, text, text) TO authenticated; -- validates admin/founder inside

-- 3) Functions that must only run from edge functions / cron (service_role)
GRANT EXECUTE ON FUNCTION public.check_login_rate_limit(text)        TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ip_rate_limit(text)           TO service_role;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_known_admin_ip(uuid, text)       TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_login_attempts()        TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_security_data()         TO service_role;
GRANT EXECUTE ON FUNCTION public.process_referral_rewards(uuid)      TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_trials()                     TO service_role;

-- 4) Trigger-only functions: execution by triggers does not require EXECUTE grant to client roles
-- (handle_new_user, auto_assign_admin_role, update_updated_at_column) — no grants needed.

-- 5) Belt-and-suspenders: harden authorization checks inside privileged RPCs
CREATE OR REPLACE FUNCTION public.acknowledge_security_alert(p_alert_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'founder'::app_role)
       OR public.has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.security_alerts
  SET acknowledged = true,
      acknowledged_at = now(),
      acknowledged_by = auth.uid()
  WHERE id = p_alert_id AND acknowledged = false;

  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id uuid, p_action text, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF public.is_privileged(p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT credits_balance INTO v_balance FROM profiles WHERE user_id = p_user_id;
  IF v_balance IS NULL OR v_balance < p_amount THEN RETURN FALSE; END IF;

  UPDATE profiles SET credits_balance = credits_balance - p_amount WHERE user_id = p_user_id;
  INSERT INTO credit_usage (user_id, action, credits_used) VALUES (p_user_id, p_action, p_amount);
  RETURN TRUE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_increment_build(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan user_plan;
  v_count INTEGER;
  v_last_date DATE;
  v_limit INTEGER;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  IF public.is_privileged(p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT plan, daily_builds_count, last_build_date
  INTO v_plan, v_count, v_last_date
  FROM profiles WHERE user_id = p_user_id;

  IF v_last_date < CURRENT_DATE THEN v_count := 0; END IF;

  CASE v_plan
    WHEN 'free' THEN v_limit := 1;
    WHEN 'pro' THEN v_limit := 5;
    WHEN 'premium' THEN v_limit := 999999;
  END CASE;

  IF v_count >= v_limit THEN RETURN FALSE; END IF;

  UPDATE profiles
  SET daily_builds_count = v_count + 1,
      last_build_date = CURRENT_DATE
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$function$;

-- Re-apply explicit grants after recreating functions (CREATE OR REPLACE preserves them, but be safe)
REVOKE EXECUTE ON FUNCTION public.acknowledge_security_alert(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.consume_credits(uuid, text, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_increment_build(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_security_alert(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_credits(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_build(uuid) TO authenticated;
