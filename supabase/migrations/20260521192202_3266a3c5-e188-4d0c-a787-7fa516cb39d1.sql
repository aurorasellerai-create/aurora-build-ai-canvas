CREATE TABLE public.correcoes_do_validador (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app_id TEXT NOT NULL,
  app_name TEXT NOT NULL,
  original_score INTEGER NOT NULL DEFAULT 0,
  corrected_score INTEGER NOT NULL DEFAULT 0,
  fixes_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  manifest_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions_removed JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions_added JSONB NOT NULL DEFAULT '[]'::jsonb,
  before_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX correcoes_do_validador_idem_uniq
  ON public.correcoes_do_validador (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX correcoes_do_validador_user_created_idx
  ON public.correcoes_do_validador (user_id, created_at DESC);

CREATE INDEX correcoes_do_validador_app_idx
  ON public.correcoes_do_validador (user_id, app_id, created_at DESC);

ALTER TABLE public.correcoes_do_validador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own validator corrections"
  ON public.correcoes_do_validador
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own validator corrections"
  ON public.correcoes_do_validador
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validator corrections"
  ON public.correcoes_do_validador
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "No deletes on validator corrections"
  ON public.correcoes_do_validador
  FOR DELETE
  TO authenticated
  USING (false);

CREATE TRIGGER trg_correcoes_do_validador_updated_at
  BEFORE UPDATE ON public.correcoes_do_validador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();