-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Durable webhook deduplication table
CREATE TABLE IF NOT EXISTS public.webhook_dedupe (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'kiwify',
  provider_transaction_id TEXT NOT NULL,
  webhook_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Unique index for race-condition-safe dedup
CREATE UNIQUE INDEX IF NOT EXISTS webhook_dedupe_provider_txn_uidx
  ON public.webhook_dedupe (provider, provider_transaction_id);

CREATE INDEX IF NOT EXISTS webhook_dedupe_expires_idx
  ON public.webhook_dedupe (expires_at);

ALTER TABLE public.webhook_dedupe ENABLE ROW LEVEL SECURITY;

-- Lock down all client access; only service_role (edge functions) may write
CREATE POLICY "No client select on webhook_dedupe" ON public.webhook_dedupe
  FOR SELECT TO authenticated, anon USING (false);
CREATE POLICY "No client insert on webhook_dedupe" ON public.webhook_dedupe
  FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY "No client update on webhook_dedupe" ON public.webhook_dedupe
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "No client delete on webhook_dedupe" ON public.webhook_dedupe
  FOR DELETE TO authenticated, anon USING (false);

-- Cleanup function (SECURITY DEFINER, locked to authenticated role — cron runs as superuser)
CREATE OR REPLACE FUNCTION public.cleanup_webhook_dedupe()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.webhook_dedupe WHERE expires_at < now();
$$;

REVOKE ALL ON FUNCTION public.cleanup_webhook_dedupe() FROM PUBLIC, anon, authenticated;

-- Schedule daily cleanup at 03:30 UTC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-webhook-dedupe') THEN
    PERFORM cron.schedule(
      'cleanup-webhook-dedupe',
      '30 3 * * *',
      $cron$ SELECT public.cleanup_webhook_dedupe(); $cron$
    );
  END IF;
END $$;