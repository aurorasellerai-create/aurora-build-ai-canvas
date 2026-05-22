CREATE POLICY "Users can cancel their own active conversion jobs"
ON public.conversion_jobs
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = ANY (ARRAY[
    'queued','preparing','installing_dependencies','running_gradle','signing',
    'optimizing','uploading','finalizing','processing','pending'
  ])
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'
);