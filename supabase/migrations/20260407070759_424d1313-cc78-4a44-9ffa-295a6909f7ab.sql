
-- Add referral columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ai_credits INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_builds INTEGER NOT NULL DEFAULT 0;

-- Generate referral codes for existing users
UPDATE public.profiles 
SET referral_code = SUBSTR(MD5(RANDOM()::TEXT || user_id::TEXT), 1, 8)
WHERE referral_code IS NULL;

-- Make referral_code NOT NULL with default
ALTER TABLE public.profiles 
ALTER COLUMN referral_code SET DEFAULT SUBSTR(MD5(RANDOM()::TEXT), 1, 8);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  rewarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one referral per referred user
ALTER TABLE public.referrals ADD CONSTRAINT unique_referred UNIQUE (referred_id);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id);

CREATE POLICY "System can insert referrals"
ON public.referrals FOR INSERT
WITH CHECK (true);

-- Function to process referral rewards
CREATE OR REPLACE FUNCTION public.process_referral_rewards(p_referrer_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_referrals INTEGER;
  v_rewarded_count INTEGER;
BEGIN
  -- Count total referrals
  SELECT COUNT(*) INTO v_total_referrals
  FROM public.referrals WHERE referrer_id = p_referrer_id;

  -- Count already rewarded
  SELECT COUNT(*) INTO v_rewarded_count
  FROM public.referrals WHERE referrer_id = p_referrer_id AND rewarded = TRUE;

  -- Mark unrewarded as rewarded
  UPDATE public.referrals 
  SET rewarded = TRUE 
  WHERE referrer_id = p_referrer_id AND rewarded = FALSE;

  -- Update profile: +1 ai_credit per new referral, +1 bonus_build per 3 total
  UPDATE public.profiles
  SET ai_credits = v_total_referrals,
      bonus_builds = FLOOR(v_total_referrals / 3.0)::INTEGER
  WHERE user_id = p_referrer_id;
END;
$$;

-- Update handle_new_user to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, referral_code)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    SUBSTR(MD5(NEW.id::TEXT || EXTRACT(EPOCH FROM now())::TEXT), 1, 8)
  );
  
  -- Check if user was referred
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    DECLARE
      v_referrer_id UUID;
    BEGIN
      SELECT user_id INTO v_referrer_id 
      FROM public.profiles 
      WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
      
      IF v_referrer_id IS NOT NULL THEN
        INSERT INTO public.referrals (referrer_id, referred_id)
        VALUES (v_referrer_id, NEW.id)
        ON CONFLICT (referred_id) DO NOTHING;
        
        PERFORM process_referral_rewards(v_referrer_id);
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
