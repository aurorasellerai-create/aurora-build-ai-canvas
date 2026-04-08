-- Create storage bucket for AAB files
INSERT INTO storage.buckets (id, name, public)
VALUES ('aab-files', 'aab-files', true);

-- Allow public read access (download links)
CREATE POLICY "AAB files are publicly downloadable"
ON storage.objects FOR SELECT
USING (bucket_id = 'aab-files');

-- Only service role can upload (worker uses service key)
-- No INSERT/UPDATE/DELETE policies for authenticated users = blocked by default