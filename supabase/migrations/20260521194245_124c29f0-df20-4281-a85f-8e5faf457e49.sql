
CREATE OR REPLACE FUNCTION public.is_privileged(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','founder','super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.check_and_increment_build(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan user_plan;
  v_count INTEGER;
  v_last_date DATE;
  v_limit INTEGER;
BEGIN
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
$$;

CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id uuid, p_action text, p_amount integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  IF public.is_privileged(p_user_id) THEN
    RETURN TRUE;
  END IF;

  SELECT credits_balance INTO v_balance FROM profiles WHERE user_id = p_user_id;
  IF v_balance < p_amount THEN RETURN FALSE; END IF;

  UPDATE profiles SET credits_balance = credits_balance - p_amount WHERE user_id = p_user_id;
  INSERT INTO credit_usage (user_id, action, credits_used) VALUES (p_user_id, p_action, p_amount);
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IN ('aurora.seller.ai@gmail.com', 'dayse74correia@hotmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'founder') ON CONFLICT DO NOTHING;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
