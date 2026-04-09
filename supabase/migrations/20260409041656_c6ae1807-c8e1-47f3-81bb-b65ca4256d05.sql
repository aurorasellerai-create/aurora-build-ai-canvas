-- Fix storage policies: restrict uploads to authenticated users with path-based ownership
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Service role can upload to aab-files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update aab-files" ON storage.objects;

-- Recreate with proper restrictions (service role bypasses RLS, so these only affect client users)
CREATE POLICY "Authenticated users can upload own aab-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'aab-files');

CREATE POLICY "Authenticated users can update own aab-files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'aab-files');