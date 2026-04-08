
-- Update check_and_increment_build to bypass for admins
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
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  SELECT plan, daily_builds_count, last_build_date
  INTO v_plan, v_count, v_last_date
  FROM profiles WHERE user_id = p_user_id;

  IF v_last_date < CURRENT_DATE THEN
    v_count := 0;
  END IF;

  CASE v_plan
    WHEN 'free' THEN v_limit := 1;
    WHEN 'pro' THEN v_limit := 5;
    WHEN 'premium' THEN v_limit := 999999;
  END CASE;

  IF v_count >= v_limit THEN
    RETURN FALSE;
  END IF;

  UPDATE profiles
  SET daily_builds_count = v_count + 1,
      last_build_date = CURRENT_DATE
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$function$;

-- Update consume_credits to bypass for admins
CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id uuid, p_action text, p_amount integer DEFAULT 1)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance INTEGER;
  v_is_admin BOOLEAN;
BEGIN
  -- Admins never consume credits
  SELECT public.has_role(p_user_id, 'admin') INTO v_is_admin;
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  SELECT credits_balance INTO v_balance FROM profiles WHERE user_id = p_user_id;
  
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE profiles SET credits_balance = credits_balance - p_amount WHERE user_id = p_user_id;
  
  INSERT INTO credit_usage (user_id, action, credits_used) VALUES (p_user_id, p_action, p_amount);
  
  RETURN TRUE;
END;
$function$;

-- Auto-assign admin role for specific emails on signup
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email IN ('aurora.seller.ai@gmail.com', 'dayse74correia@hotmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on auth.users for auto admin assignment
CREATE OR REPLACE TRIGGER assign_admin_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();
