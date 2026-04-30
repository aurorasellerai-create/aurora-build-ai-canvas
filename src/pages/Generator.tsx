import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Globe, Type, AlertTriangle, Zap } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import GenerationRetryButton from "@/components/GenerationRetryButton";
import UrlHistoryClearButton from "@/components/UrlHistoryClearButton";
import { useCredits } from "@/hooks/useCredits";
import { setSelectedAppFormatPreference } from "@/lib/appFormatPreference";
import { clearLastGenerationError, getGenerationExceptionMessage, getGenerationFailureMessage, getLastGenerationError, saveLastGenerationError } from "@/lib/generationErrorMessages";
import { clearNormalizedSiteUrlHistory, getNormalizedSiteUrlHistory, getSiteUrlPreview, saveNormalizedSiteUrlToHistory, validateSiteUrl } from "@/lib/siteUrlValidation";

const formatLimits: Record<Enums<"user_plan">, Enums<"app_format">[]> = {
  free: ["apk"],
  pro: ["apk"],
  premium: ["apk", "aab", "pwa"],
};

type GenerationFormData = {
  siteUrl: string;
  appName: string;
  format: Enums<"app_format">;
};

const Generator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteUrl, setSiteUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [format, setFormat] = useState<Enums<"app_format">>("apk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => getLastGenerationError());
  const [siteUrlTouched, setSiteUrlTouched] = useState(false);
  const [urlHistory, setUrlHistory] = useState<string[]>(() => getNormalizedSiteUrlHistory());
  const [lastFailedSubmission, setLastFailedSubmission] = useState<GenerationFormData | null>(null);
  const { plan, checkAccess, paywallOpen, setPaywallOpen, paywallFeature, projectCount } = usePaywall();
  const { balance, consumeCredits, getCost } = useCredits();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const allowedFormats = formatLimits[plan as Enums<"user_plan">];
  const siteUrlValidation = validateSiteUrl(siteUrl);
  const siteUrlPreview = siteUrlValidation.isValid ? getSiteUrlPreview(siteUrlValidation.value) : null;
  const showSiteUrlError = siteUrlTouched && !siteUrlValidation.isValid;

  const submitGeneration = async (formData: GenerationFormData) => {
    if (!user) return;
    setError("");
    setLastFailedSubmission(null);

    // Paywall: check if creating second+ app on free
    if (!checkAccess("second_app")) return;

    const failGeneration = (message: string) => {
      setError(message);
      saveLastGenerationError(message);
      setLastFailedSubmission(formData);
    };

    try {
      setLoading(true);

      // Check format allowed
      if (!allowedFormats.includes(formData.format)) {
        if (!checkAccess("premium_format")) return;
        failGeneration(getGenerationFailureMessage("format_unavailable"));
        return;
      }

      // Consume credits
      const credited = await consumeCredits("generate_app");
      if (!credited) {
        failGeneration(getGenerationFailureMessage("credits"));
        return;
      }

      // Check build limit
      const { data: canBuild, error: buildError } = await supabase.rpc("check_and_increment_build", {
        p_user_id: user.id,
      });

      if (buildError) {
        failGeneration(getGenerationFailureMessage("database", buildError.message));
        return;
      }

      if (!canBuild) {
        failGeneration(getGenerationFailureMessage("daily_limit"));
        return;
      }

      // Create project
      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          site_url: formData.siteUrl,
          app_name: formData.appName,
          format: formData.format,
          status: "processing",
          progress: 0,
        })
        .select()
        .single();

      if (insertError) {
        failGeneration(getGenerationFailureMessage("database", insertError.message));
        return;
      }

      clearLastGenerationError();
      navigate(`/processing/${data.id}`);
    } catch (err) {
      failGeneration(getGenerationExceptionMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiteUrlTouched(true);

    if (!siteUrlValidation.isValid) {
      setError(siteUrlValidation.message);
      saveLastGenerationError(siteUrlValidation.message);
      setLastFailedSubmission(null);
      return;
    }

    setUrlHistory(saveNormalizedSiteUrlToHistory(siteUrlValidation.value));
    await submitGeneration({ siteUrl: siteUrlValidation.value, appName, format });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Criar App</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleGenerate}
          className="card-aurora space-y-6"
        >
          <div className="text-center mb-4">
            <h2 className="font-display text-2xl font-bold text-foreground">Crie seu app</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Plano <span className="text-primary font-semibold capitalize">{plan}</span> · 3 passos simples
            </p>
          </div>

          {/* Step 1 */}
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
                onChange={(e) => {
                  setSiteUrl(e.target.value);
                  if (!siteUrlTouched) setSiteUrlTouched(true);
                  if (error === siteUrlValidation.message) setError("");
                }}
                onBlur={() => setSiteUrlTouched(true)}
                aria-invalid={showSiteUrlError}
                aria-describedby="site-url-error"
                required
                className={`w-full pl-10 pr-4 py-3 rounded-lg bg-muted border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition ${showSiteUrlError ? "border-destructive focus:ring-destructive" : "border-border focus:ring-primary"}`}
              />
            </div>
            {showSiteUrlError && (
              <p id="site-url-error" className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {siteUrlValidation.message}
              </p>
            )}
            {siteUrlPreview && (
              <div className="mt-3 rounded-lg border border-secondary/20 bg-secondary/5 p-3">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Confirmar site detectado</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Protocolo</p>
                    <p className="text-sm font-semibold text-secondary">{siteUrlPreview.protocol}</p>
                  </div>
                  <div className="rounded-md border border-border bg-background/50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Domínio</p>
                    <p className="truncate text-sm font-semibold text-foreground">{siteUrlPreview.domain}</p>
                  </div>
                </div>
              </div>
            )}
            {urlHistory.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">URLs recentes</p>
                  <UrlHistoryClearButton onConfirm={() => setUrlHistory(clearNormalizedSiteUrlHistory())} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {urlHistory.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        setSiteUrl(url);
                        setSiteUrlTouched(true);
                        setError("");
                      }}
                      className="max-w-full truncate rounded-md border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-secondary"
                    >
                      {url}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2 */}
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

          {/* Step 3 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-3">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">3</span>
              Formato
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
                    onClick={() => {
                      if (allowed) {
                        setFormat(f);
                        setSelectedAppFormatPreference(f);
                      } else {
                        checkAccess("premium_format");
                      }
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-display text-sm transition-all duration-300 ${
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
              <p className="text-xs text-destructive/80 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" /> APK não é aceito na Play Store — use AAB para publicar
              </p>
            )}
          </div>

          {error && (
            <div className="flex flex-col gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-destructive text-sm">{error}</p>
              </div>
              {lastFailedSubmission && (
                <GenerationRetryButton loading={loading} lastError={error} onRetry={() => submitGeneration(lastFailedSubmission)} />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !siteUrlValidation.isValid}
            className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex flex-col items-center justify-center gap-1"
          >
            <span className="flex items-center gap-2">
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Gerar App
            </span>
            <span className="text-xs opacity-75 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Consome {getCost("generate_app")} créditos · Saldo: {balance}
            </span>
          </button>
        </motion.form>
      </div>
    </div>
  );
};

export default Generator;
