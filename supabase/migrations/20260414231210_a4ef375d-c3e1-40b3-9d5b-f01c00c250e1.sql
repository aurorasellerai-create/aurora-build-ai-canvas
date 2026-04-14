
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email logs"
ON public.email_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "No direct insert on email logs"
ON public.email_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No update on email logs"
ON public.email_logs
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No delete on email logs"
ON public.email_logs
FOR DELETE
TO authenticated
USING (false);

CREATE POLICY "No anon access to email logs"
ON public.email_logs
FOR SELECT
TO anon
USING (false);

CREATE INDEX idx_email_logs_created_at ON public.email_logs (created_at DESC);
CREATE INDEX idx_email_logs_template ON public.email_logs (template_name);
