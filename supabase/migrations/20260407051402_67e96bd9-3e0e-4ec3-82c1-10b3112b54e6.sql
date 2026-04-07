
-- Add build tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN daily_builds_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN last_build_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Function to check build limits and increment
CREATE OR REPLACE FUNCTION public.check_and_increment_build(p_user_id UUID)
RETURNS BOOLEAN
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
  SELECT plan, daily_builds_count, last_build_date
  INTO v_plan, v_count, v_last_date
  FROM profiles WHERE user_id = p_user_id;

  -- Reset count if new day
  IF v_last_date < CURRENT_DATE THEN
    v_count := 0;
  END IF;

  -- Set limit based on plan
  CASE v_plan
    WHEN 'free' THEN v_limit := 1;
    WHEN 'pro' THEN v_limit := 5;
    WHEN 'premium' THEN v_limit := 999999;
  END CASE;

  -- Check limit
  IF v_count >= v_limit THEN
    RETURN FALSE;
  END IF;

  -- Increment
  UPDATE profiles
  SET daily_builds_count = v_count + 1,
      last_build_date = CURRENT_DATE
  WHERE user_id = p_user_id;

  RETURN TRUE;
END;
$$;
