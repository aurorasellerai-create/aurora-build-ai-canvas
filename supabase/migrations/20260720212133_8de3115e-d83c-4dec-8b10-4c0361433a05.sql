-- Aurora Validator AI: single source of truth for real AAB analyses + AI explanation cache

CREATE TABLE IF NOT EXISTS public.validator_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id        UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  storage_path      TEXT NOT NULL,
  file_name         TEXT,
  file_size         BIGINT,
  file_hash         TEXT,
  app_format        TEXT NOT NULL DEFAULT 'aab',
  status            TEXT NOT NULL DEFAULT 'queued',  -- queued|processing|completed|failed
  error             TEXT,
  correlation_id    TEXT,

  -- Real extracted data
  package_name      TEXT,
  version_name      TEXT,
  version_code      INTEGER,
  min_sdk           INTEGER,
  target_sdk        INTEGER,
  compile_sdk       INTEGER,

  manifest          JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions       JSONB NOT NULL DEFAULT '[]'::jsonb,
  sdks              JSONB NOT NULL DEFAULT '[]'::jsonb,
  apis              JSONB NOT NULL DEFAULT '[]'::jsonb,
  deep_links        JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature         JSONB NOT NULL DEFAULT '{}'::jsonb,
  components        JSONB NOT NULL DEFAULT '{}'::jsonb,     -- activities/services/receivers/providers
  bundle_config     JSONB NOT NULL DEFAULT '{}'::jsonb,     -- splits, densities, languages
  dex_summary       JSONB NOT NULL DEFAULT '[]'::jsonb,

  findings          JSONB NOT NULL DEFAULT '[]'::jsonb,     -- normalized finding list
  score             INTEGER,
  score_breakdown   JSONB NOT NULL DEFAULT '{}'::jsonb,

  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.validator_analyses TO authenticated;
GRANT ALL ON public.validator_analyses TO service_role;

ALTER TABLE public.validator_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own analyses"
  ON public.validator_analyses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_privileged(auth.uid()));

CREATE POLICY "Users insert own analyses"
  ON public.validator_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own analyses"
  ON public.validator_analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own analyses"
  ON public.validator_analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_validator_analyses_user   ON public.validator_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validator_analyses_hash   ON public.validator_analyses (user_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_validator_analyses_status ON public.validator_analyses (status);

CREATE TRIGGER trg_validator_analyses_updated
  BEFORE UPDATE ON public.validator_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.validator_analyses;


-- Cache of AI-generated explanations, one per (analysis, finding_key)
CREATE TABLE IF NOT EXISTS public.validator_ai_explanations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID NOT NULL REFERENCES public.validator_analyses(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  finding_key   TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'ai',       -- ai|knowledge_base|hybrid|heuristic
  severity      TEXT,
  model         TEXT,
  payload       JSONB NOT NULL,                    -- full structured explanation
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, finding_key)
);

GRANT SELECT, INSERT, DELETE ON public.validator_ai_explanations TO authenticated;
GRANT ALL ON public.validator_ai_explanations TO service_role;

ALTER TABLE public.validator_ai_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own explanations"
  ON public.validator_ai_explanations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_privileged(auth.uid()));

CREATE POLICY "Users insert own explanations"
  ON public.validator_ai_explanations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own explanations"
  ON public.validator_ai_explanations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_validator_ai_explanations_analysis
  ON public.validator_ai_explanations (analysis_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.validator_ai_explanations;
