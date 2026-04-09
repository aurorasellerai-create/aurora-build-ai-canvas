
-- Allow public read access to aab-files bucket
CREATE POLICY "Public read access for aab-files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'aab-files');

-- Allow service role and authenticated users to upload
CREATE POLICY "Service role can upload to aab-files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'aab-files');

-- Allow service role to update objects in aab-files
CREATE POLICY "Service role can update aab-files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'aab-files');
