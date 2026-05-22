CREATE POLICY "Users can timeout their own stale conversion jobs"
ON public.conversion_jobs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('queued', 'preparing', 'installing_dependencies', 'running_gradle', 'signing', 'optimizing', 'uploading', 'finalizing', 'processing', 'pending')
  AND COALESCE(started_at, created_at) < now() - interval '10 minutes'
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'timeout'
);