
-- Create conversion_jobs table
CREATE TABLE public.conversion_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  progress INTEGER NOT NULL DEFAULT 0,
  step_label TEXT DEFAULT 'Aguardando...',
  download_url TEXT,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversion_jobs ENABLE ROW LEVEL SECURITY;

-- Users can view their own jobs
CREATE POLICY "Users can view their own conversion jobs"
ON public.conversion_jobs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can create their own jobs
CREATE POLICY "Users can create their own conversion jobs"
ON public.conversion_jobs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No direct update from users (only backend/service role)
-- No delete from users

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversion_jobs;

-- Trigger for updated_at
CREATE TRIGGER update_conversion_jobs_updated_at
BEFORE UPDATE ON public.conversion_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
