-- =========================================================
-- PAINEL DE SEGURANÇA PREMIUM
-- =========================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------
-- 1. admin_2fa
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_2fa (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_2fa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own 2FA status"
ON public.admin_2fa FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "No direct insert on 2FA"
ON public.admin_2fa FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "No direct update on 2FA"
ON public.admin_2fa FOR UPDATE TO authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "No direct delete on 2FA"
ON public.admin_2fa FOR DELETE TO authenticated
USING (false);

CREATE TRIGGER update_admin_2fa_updated_at
  BEFORE UPDATE ON public.admin_2fa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- 2. admin_audit_log
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin ON public.admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_action ON public.admin_audit_log(action, created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
ON public.admin_audit_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "No direct insert audit"
ON public.admin_audit_log FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "No update audit"
ON public.admin_audit_log FOR UPDATE TO authenticated
USING (false);

CREATE POLICY "No delete audit"
ON public.admin_audit_log FOR DELETE TO authenticated
USING (false);

-- ---------------------------------------------------------
-- 3. security_alerts
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip TEXT,
  user_agent TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_admin ON public.security_alerts(admin_id, created_at DESC);
CREATE INDEX idx_alerts_unack ON public.security_alerts(acknowledged, severity, created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view alerts"
ON public.security_alerts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "No direct insert alerts"
ON public.security_alerts FOR INSERT TO authenticated
WITH CHECK (false);

CREATE POLICY "Admins can ack alerts"
ON public.security_alerts FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

CREATE POLICY "No delete alerts"
ON public.security_alerts FOR DELETE TO authenticated
USING (false);

-- ---------------------------------------------------------
-- 4. Extensão de login_attempts
-- ---------------------------------------------------------
ALTER TABLE public.login_attempts
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON public.login_attempts(ip, attempted_at DESC);

-- ---------------------------------------------------------
-- 5. Permitir admins lerem login_attempts
-- ---------------------------------------------------------
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role));

-- ---------------------------------------------------------
-- 6. RPCs SECURITY DEFINER
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  INSERT INTO public.admin_audit_log (admin_id, action, target_type, target_id, metadata, ip, user_agent)
  VALUES (auth.uid(), p_action, p_target_type, p_target_id, COALESCE(p_metadata, '{}'::jsonb), p_ip, p_user_agent)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_security_alert(p_alert_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'founder'::app_role)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  UPDATE public.security_alerts
  SET acknowledged = true,
      acknowledged_at = now(),
      acknowledged_by = auth.uid()
  WHERE id = p_alert_id AND acknowledged = false;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_known_admin_ip(p_admin_id UUID, p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.login_attempts
    WHERE email IN (SELECT email FROM auth.users WHERE id = p_admin_id)
      AND ip = p_ip
      AND success = true
      AND attempted_at > now() - interval '180 days'
  );
$$;

CREATE OR REPLACE FUNCTION public.check_ip_rate_limit(p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 10
  FROM public.login_attempts
  WHERE ip = p_ip
    AND success = false
    AND attempted_at > now() - interval '15 minutes';
$$;

-- ---------------------------------------------------------
-- 7. Cron job: limpar tentativas antigas (>30 dias)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_security_data()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '30 days';
  DELETE FROM public.security_alerts WHERE acknowledged = true AND acknowledged_at < now() - interval '90 days';
$$;

-- Agenda diária às 04:00 (se pg_cron disponível)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cleanup-security-data') 
    FROM cron.job WHERE jobname = 'cleanup-security-data';
    PERFORM cron.schedule(
      'cleanup-security-data',
      '0 4 * * *',
      $cron$SELECT public.cleanup_old_security_data();$cron$
    );
  END IF;
END $$;