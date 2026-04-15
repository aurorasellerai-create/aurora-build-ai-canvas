
-- Fix 1: Add INSERT policy for aab-files (owner-scoped)
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'aab-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 2: Add UPDATE policy for aab-files (owner-scoped)
CREATE POLICY "Users can update their own files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'aab-files'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix 3: Block non-admin writes on system_logs
CREATE POLICY "Only admins can insert system logs"
ON public.system_logs
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Block update on system logs"
ON public.system_logs
FOR UPDATE
USING (false);

CREATE POLICY "Block delete on system logs"
ON public.system_logs
FOR DELETE
USING (false);
