
-- Table for persisting admin settings (plans, feature toggles, credit costs, globals)
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins/founders can read settings
CREATE POLICY "Admins can view settings"
  ON public.system_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

-- No direct write from client - all writes go through edge function with service_role
CREATE POLICY "No direct insert"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct update"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct delete"
  ON public.system_settings FOR DELETE
  TO authenticated
  USING (false);

-- Trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings
INSERT INTO public.system_settings (key, value) VALUES
  ('plan_config', '[
    {"plan":"free","price":"Grátis","credits":5,"builds":1,"formats":["APK"]},
    {"plan":"pro","price":"R$ 39/mês","credits":50,"builds":5,"formats":["APK"]},
    {"plan":"premium","price":"R$ 59/mês","credits":500,"builds":999999,"formats":["APK","AAB","PWA"]}
  ]'::jsonb),
  ('credit_costs', '{
    "generate_app":3,"generate_business":2,"ai_tool_names":1,"ai_tool_ideas":1,
    "ai_tool_description":1,"ai_tool_icon":1,"ai_tool_splash":1,"ai_carousel":5,
    "ai_video_5s":10,"ai_video_10s":20,"ai_video_15s":30,"ai_video_30s":60,
    "ai_video_continue":30,"convert_aab":100
  }'::jsonb),
  ('feature_toggles', '{
    "generate_app":true,"ai_tools":true,"video_gen":true,"carousel_gen":true,
    "business_gen":true,"convert_aab":true,"translation":true,"remove_bg":true
  }'::jsonb),
  ('global_config', '{"system_name":"Aurora Build","maintenance_mode":false}'::jsonb);
