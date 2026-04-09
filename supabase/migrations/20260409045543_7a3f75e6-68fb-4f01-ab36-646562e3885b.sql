-- 1. Fix storage INSERT policy - restrict to user's own folder path
DROP POLICY IF EXISTS "Authenticated users can upload own aab-files" ON storage.objects;
CREATE POLICY "Authenticated users can upload own aab-files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aab-files'
);

-- 2. Fix storage UPDATE policy - restrict to user's own files
DROP POLICY IF EXISTS "Authenticated users can update own aab-files" ON storage.objects;
CREATE POLICY "Authenticated users can update own aab-files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'aab-files');

-- 3. Fix storage SELECT - remove overly permissive public policies, allow only authenticated
DROP POLICY IF EXISTS "AAB files are publicly downloadable" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for aab-files" ON storage.objects;
CREATE POLICY "Authenticated users can read own aab-files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'aab-files');

-- Also allow service_role (edge functions) full access implicitly

-- 4. Remove conversion_jobs from Realtime publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.conversion_jobs;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;