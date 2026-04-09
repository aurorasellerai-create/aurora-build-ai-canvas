-- 2. Remove credit tables from Realtime (ignore error if not present)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_purchases;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_usage;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 3. Add explicit deny policy for anon on system_logs (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'system_logs' AND policyname = 'No anonymous access to system logs'
  ) THEN
    CREATE POLICY "No anonymous access to system logs"
    ON public.system_logs FOR SELECT TO anon USING (false);
  END IF;
END $$;