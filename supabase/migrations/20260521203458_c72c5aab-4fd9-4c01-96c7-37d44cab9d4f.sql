-- 1) Make AAB bucket private
UPDATE storage.buckets SET public = false WHERE id = 'aab-files';

-- 2) Refresh owner-only storage.objects policies for aab-files
DROP POLICY IF EXISTS "aab_files_select_own" ON storage.objects;
DROP POLICY IF EXISTS "aab_files_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "aab_files_update_own" ON storage.objects;
DROP POLICY IF EXISTS "aab_files_delete_own" ON storage.objects;

CREATE POLICY "aab_files_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aab_files_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aab_files_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "aab_files_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'aab-files' AND (storage.foldername(name))[1] = auth.uid()::text);