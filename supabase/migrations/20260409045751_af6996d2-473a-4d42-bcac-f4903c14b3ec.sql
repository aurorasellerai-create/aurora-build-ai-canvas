-- Add restrictive DELETE policy - only service_role should delete files
CREATE POLICY "No user deletion of aab-files"
ON storage.objects FOR DELETE TO authenticated
USING (false);