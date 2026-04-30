import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Globe, Type, AlertTriangle, Zap } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import { useCredits } from "@/hooks/useCredits";
import { pwaAndroidFlowSteps, pwaAndroidImplementations } from "@/lib/pwaAndroidFlow";

const formatLimits: Record<Enums<"user_plan">, Enums<"app_format">[]> = {
  free: ["apk"],
  pro: ["apk"],
  premium: ["apk", "aab", "pwa"],
};

const ConvertSite = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteUrl, setSiteUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [format, setFormat] = useState<Enums<"app_format">>("apk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { plan, checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();
  const { balance, consumeCredits, getCost } = useCredits();

  const allowedFormats = formatLimits[plan as Enums<"user_plan">];
  const currentStep = (!siteUrl || !appName) ? 1 : 2;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    if (!checkAccess("second_app")) return;
    setLoading(true);

    if (!allowedFormats.includes(format)) {
      if (!checkAccess("premium_format")) { setLoading(false); return; }
      setError(`Formato ${format.toUpperCase()} não disponível no plano ${plan}.`);
      setLoading(false);
      return;
    }

    const credited = await consumeCredits("generate_app");
    if (!credited) { setLoading(false); return; }

    const { data: canBuild } = await supabase.rpc("check_and_increment_build", { p_user_id: user.id });
    if (!canBuild) {
      setError("Limite diário atingido! Faça upgrade para mais builds.");
      setLoading(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({ user_id: user.id, site_url: siteUrl, app_name: appName, format, status: "processing", progress: 0 })
      .select()
      .single();

    if (insertError) { setError(insertError.message); setLoading(false); return; }
    navigate(`/processing/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/generator" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Converter Site em App</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" /> {balance}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-8">
        <div className="flex items-center gap-2 mb-8">
          {["Dados do site", "Formato e gerar"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                i + 1 <= currentStep ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i + 1 <= currentStep ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {step}
              </span>
              {i < 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleGenerate}
          className="card-aurora space-y-6"
        >
          <div className="text-center">
            <Globe className="w-8 h-8 text-secondary mx-auto mb-2" />
            <h2 className="font-display text-xl font-bold text-foreground">Transforme seu site em app</h2>
            <p className="text-sm text-muted-foreground mt-1">URL → base PWA → APK, AAB ou PWA</p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <p className="text-xs font-bold text-foreground">Núcleo Aurora Build</p>
            {pwaAndroidFlowSteps.slice(1).map((step) => (
              <p key={step} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-0.5 text-primary">✓</span> {step}
              </p>
            ))}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
              URL do site
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="url"
                placeholder="https://meusite.com"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
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
                placeholder="Meu App"
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
            {format === "aab" && (
              <p className="text-xs text-primary flex items-center gap-1 mt-2">✓ Padrão ideal: PWA como base e AAB para publicação</p>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {pwaAndroidImplementations.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-[11px] font-bold text-primary">{item.badge}</p>
                <p className="text-xs font-bold text-foreground">{item.title}</p>
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
            Converter para App
          </button>
        </motion.form>
      </div>
    </div>
  );
};

export default ConvertSite;
