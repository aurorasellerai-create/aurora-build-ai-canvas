import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Globe, Type, AlertTriangle, Zap, Sparkles, ExternalLink, HelpCircle } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import { useCredits } from "@/hooks/useCredits";
import { pwaAndroidFlowSteps, pwaAndroidOutputs } from "@/lib/pwaAndroidFlow";
import { getGenerationExceptionMessage, getGenerationFailureMessage } from "@/lib/generationErrorMessages";

const formatLimits: Record<Enums<"user_plan">, Enums<"app_format">[]> = {
  free: ["apk"],
  pro: ["apk"],
  premium: ["apk", "aab", "pwa"],
};

type Origin = null | "lovable" | "other" | "none";

const CreateFromScratch = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [origin, setOrigin] = useState<Origin>(null);
  const [siteUrl, setSiteUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [format, setFormat] = useState<Enums<"app_format">>("apk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { plan, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();
  const { balance, consumeCredits, getCost } = useCredits();

  const allowedFormats = formatLimits[plan as Enums<"user_plan">];

  const currentStep = origin === null ? 1 : (!siteUrl || !appName) ? 2 : 3;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (!checkAccess("second_app")) return;

    try {
      setLoading(true);

      if (!allowedFormats.includes(format)) {
        if (!checkAccess("premium_format")) return;
        setError(getGenerationFailureMessage("format_unavailable"));
        return;
      }

      const credited = await consumeCredits("generate_app");
      if (!credited) {
        setError(getGenerationFailureMessage("credits"));
        return;
      }

      const { data: canBuild, error: buildError } = await supabase.rpc("check_and_increment_build", { p_user_id: user.id });
      if (buildError) {
        setError(getGenerationFailureMessage("database", buildError.message));
        return;
      }
      if (!canBuild) {
        setError(getGenerationFailureMessage("daily_limit"));
        return;
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({ user_id: user.id, site_url: siteUrl, app_name: appName, format, status: "processing", progress: 0 })
        .select()
        .single();

      if (insertError) {
        setError(getGenerationFailureMessage("database", insertError.message));
        return;
      }
      navigate(`/processing/${data.id}`);
    } catch (err) {
      setError(getGenerationExceptionMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/generator" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Criar App do Zero</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" /> {balance}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {["Origem", "Dados do app", "Formato e gerar"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                i + 1 <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i + 1 <= currentStep ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {step}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          {/* Step 1: Origin */}
          {origin === null && (
            <>
              <div className="text-center">
                <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
                <h2 className="font-display text-xl font-bold text-foreground">De onde vem seu app?</h2>
                <p className="text-sm text-muted-foreground mt-1">Selecione a origem do seu projeto</p>
              </div>
              <div className="space-y-3">
                {[
                  { id: "lovable" as const, label: "Criado no Lovable", desc: "Cole o link do seu projeto Lovable" },
                  { id: "other" as const, label: "Criado em outra plataforma", desc: "Cole o link do seu site ou app web" },
                  { id: "none" as const, label: "Não tenho app ainda", desc: "Crie a partir de qualquer URL de site" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOrigin(opt.id)}
                    className="w-full text-left p-4 rounded-lg border border-border bg-muted/30 hover:border-primary/40 transition-all"
                  >
                    <p className="font-display font-bold text-sm text-foreground">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 2+3: Form */}
          {origin !== null && (
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="text-center">
                <h2 className="font-display text-xl font-bold text-foreground">
                  {origin === "lovable" ? "Projeto Lovable" : origin === "other" ? "Seu projeto externo" : "Criar a partir de um site"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">A IA organiza a base PWA antes do Android</p>
                <button type="button" onClick={() => setOrigin(null)} className="text-xs text-primary hover:underline mt-1">
                  ← Mudar origem
                </button>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                {pwaAndroidFlowSteps.map((step) => (
                  <p key={step} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 text-primary">✓</span> {step}
                  </p>
                ))}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  {origin === "lovable" ? "Link do projeto Lovable" : "URL do site"}
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    placeholder={origin === "lovable" ? "https://meuapp.lovable.app" : "https://meusite.com.br"}
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                  />
                </div>
                {origin === "lovable" && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <HelpCircle className="w-3 h-3" /> Use o link publicado do seu projeto Lovable
                  </p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">2</span>
                  Nome do app
                </label>
                <div className="relative">
                  <Type className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Meu App Incrível"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
                  Formato de exportação
                </label>
                <div className="space-y-2">
                  {([
                    { f: "apk" as const, label: "APK", hint: "Para testes no celular" },
                    { f: "aab" as const, label: "AAB", hint: "Para Google Play Store" },
                    { f: "pwa" as const, label: "PWA", hint: "App web instalável" },
                  ]).map(({ f, label, hint }) => {
                    const allowed = allowedFormats.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => allowed ? setFormat(f) : checkAccess("premium_format")}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-display text-sm transition-all ${
                          format === f
                            ? "bg-primary text-primary-foreground glow-gold"
                            : allowed
                            ? "bg-muted text-foreground border border-border hover:border-secondary"
                            : "bg-muted/50 text-muted-foreground/40 border border-border cursor-pointer"
                        }`}
                      >
                        <span className="font-bold">{label} {!allowed && "🔒"}</span>
                        <span className={`text-xs ${format === f ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{hint}</span>
                      </button>
                    );
                  })}
                </div>
                {format === "apk" && (
                  <p className="text-xs text-destructive/80 flex items-center gap-1 mt-2">
                    <AlertTriangle className="w-3 h-3" /> APK não é aceito na Play Store — use AAB para publicar
                  </p>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {pwaAndroidOutputs.map((output) => (
                  <div key={output.label} className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-xs font-bold text-foreground">{output.label}</p>
                    <p className="text-xs text-muted-foreground">{output.description}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  Essa ação consumirá <span className="font-bold text-foreground">{getCost("generate_app")} créditos</span>
                  <span className="text-border mx-1">·</span>
                  Saldo: <span className="font-bold text-primary">{balance}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Gerar App
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CreateFromScratch;
