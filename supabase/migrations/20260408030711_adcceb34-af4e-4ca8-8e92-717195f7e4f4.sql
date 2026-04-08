
CREATE TABLE public.system_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  category TEXT NOT NULL DEFAULT 'system' CHECK (category IN ('webhook', 'credits', 'build', 'ai', 'payment', 'navigation', 'performance', 'system', 'auth')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolution_method TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read via edge function (service role), no direct user access
CREATE POLICY "No direct access to system logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX idx_system_logs_severity ON public.system_logs (severity);
CREATE INDEX idx_system_logs_category ON public.system_logs (category);
