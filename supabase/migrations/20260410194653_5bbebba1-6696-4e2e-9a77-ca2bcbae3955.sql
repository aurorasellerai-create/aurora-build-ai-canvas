
-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tipo_usuario text NOT NULL DEFAULT 'cliente',
  ADD COLUMN IF NOT EXISTS teste_expira_em timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

-- Create function to expire trials automatically
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET tipo_usuario = 'cliente', plan = 'free'
  WHERE tipo_usuario != 'vip'
    AND teste_expira_em IS NOT NULL
    AND teste_expira_em < now()
    AND (plan != 'free' OR tipo_usuario != 'cliente');
END;
$$;

-- Allow admins/founders to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
