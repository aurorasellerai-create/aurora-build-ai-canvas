-- Remove duplicate/conflicting DELETE policy on aab-files bucket.
-- Owner-scoped deletion (aab_files_delete_own) is intentional per security memory;
-- the always-false "No user deletion of aab-files" policy is overridden by OR-permissive logic
-- and is therefore stale/misleading. Also drop the duplicate SELECT alias for clarity.
DROP POLICY IF EXISTS "No user deletion of aab-files" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own aab-files" ON storage.objects;