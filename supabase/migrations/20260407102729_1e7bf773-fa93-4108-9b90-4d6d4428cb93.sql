
-- Add credits_balance to profiles (default based on plan will be handled in code)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_balance INTEGER NOT NULL DEFAULT 5;

-- Credit purchases table
CREATE TABLE public.credit_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  package_name TEXT NOT NULL,
  credits_amount INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  provider TEXT NOT NULL DEFAULT 'kiwify',
  provider_transaction_id TEXT,
  status public.payment_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit purchases"
  ON public.credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER update_credit_purchases_updated_at
  BEFORE UPDATE ON public.credit_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Credit usage tracking table
CREATE TABLE public.credit_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit usage"
  ON public.credit_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Function to consume credits
CREATE OR REPLACE FUNCTION public.consume_credits(p_user_id UUID, p_action TEXT, p_amount INTEGER DEFAULT 1)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT credits_balance INTO v_balance FROM profiles WHERE user_id = p_user_id;
  
  IF v_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE profiles SET credits_balance = credits_balance - p_amount WHERE user_id = p_user_id;
  
  INSERT INTO credit_usage (user_id, action, credits_used) VALUES (p_user_id, p_action, p_amount);
  
  RETURN TRUE;
END;
$$;
