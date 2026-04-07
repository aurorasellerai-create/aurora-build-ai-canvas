import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Globe, Type, AlertTriangle } from "lucide-react";
import type { Enums } from "@/integrations/supabase/types";

const formatLimits: Record<Enums<"user_plan">, Enums<"app_format">[]> = {
  free: ["apk"],
  pro: ["apk"],
  premium: ["apk", "aab", "pwa"],
};

const Generator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [siteUrl, setSiteUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [format, setFormat] = useState<Enums<"app_format">>("apk");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const plan = profile?.plan || "free";
  const allowedFormats = formatLimits[plan];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError("");
    setLoading(true);

    // Check format allowed
    if (!allowedFormats.includes(format)) {
      setError(`Formato ${format.toUpperCase()} não disponível no plano ${plan}. Faça upgrade!`);
      setLoading(false);
      return;
    }

    // Check build limit
    const { data: canBuild } = await supabase.rpc("check_and_increment_build", {
      p_user_id: user.id,
    });

    if (!canBuild) {
      setError("Limite diário atingido! Faça upgrade para mais builds.");
      setLoading(false);
      return;
    }

    // Create project
    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        site_url: siteUrl,
        app_name: appName,
        format,
        status: "processing",
        progress: 0,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    navigate(`/processing/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
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
                onChange={(e) => setSiteUrl(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
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
            <div className="flex gap-3">
              {(["apk", "aab", "pwa"] as const).map((f) => {
                const allowed = allowedFormats.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => allowed && setFormat(f)}
                    className={`flex-1 py-3 rounded-lg font-display font-semibold text-sm uppercase transition-all duration-300 ${
                      format === f
                        ? "bg-primary text-primary-foreground glow-gold"
                        : allowed
                        ? "bg-muted text-muted-foreground border border-border hover:border-secondary"
                        : "bg-muted/50 text-muted-foreground/40 border border-border cursor-not-allowed line-through"
                    }`}
                    title={!allowed ? `Disponível no plano Premium` : ""}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
            {plan !== "premium" && (
              <p className="text-xs text-muted-foreground mt-2">
                AAB e PWA disponíveis no plano Premium.{" "}
                <Link to="/pricing" className="text-primary hover:underline">Fazer upgrade</Link>
              </p>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            Gerar App
          </button>
        </motion.form>
      </div>
    </div>
  );
};

export default Generator;
