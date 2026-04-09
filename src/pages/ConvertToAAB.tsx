import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, ArrowLeft, Globe, AlertTriangle, Zap, Shield,
  CheckCircle2, Smartphone, Clock, RefreshCw, XCircle
} from "lucide-react";
import ConvertInfoBlocks from "@/components/ConvertInfoBlocks";
import { usePaywall } from "@/hooks/usePaywall";
import PaywallModal from "@/components/PaywallModal";
import { useCredits } from "@/hooks/useCredits";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type JobStatus = "idle" | "processing" | "done" | "error";

const ConvertToAAB = () => {
  const { user } = useAuth();
  const [appUrl, setAppUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState("Processando...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const { checkAccess, paywallOpen, setPaywallOpen, paywallFeature } = usePaywall();
  const { balance, consumeCredits, getCost } = useCredits();

  const isValidUrl = appUrl.startsWith("https://") && appUrl.length > 12;

  // Realtime listener — only when jobId is set
  useEffect(() => {
    if (!jobId) return;

    // Clean up any previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversion_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const row = payload.new as {
            status: string;
            progress: number;
            step_label: string | null;
            error_message: string | null;
          };

          setProgress(row.progress ?? 0);
          setStepLabel(row.step_label ?? "Processando...");

          if (row.status === "done") {
            setJobStatus("done");
            toast({ title: "App Android gerado! 🚀", description: "Seu arquivo AAB está pronto." });
          } else if (row.status === "error") {
            setJobStatus("error");
            setErrorMessage(row.error_message || "Erro inesperado.");
            toast({ title: "Erro na conversão", description: row.error_message || "Tente novamente.", variant: "destructive" });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [jobId]);

  const handleConvert = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValidUrl || loading) return;
    if (!checkAccess("second_app")) return;

    setLoading(true);
    const credited = await consumeCredits("convert_aab");
    if (!credited) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("convert-app", {
        body: { url: appUrl },
      });

      if (error) throw error;

      if (!data?.job_id) {
        toast({ title: "Erro", description: data?.error || "Falha ao iniciar conversão.", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Set state AFTER confirmed job_id
      setProgress(0);
      setStepLabel("Iniciando processamento...");
      setErrorMessage(null);
      setJobId(data.job_id);
      setJobStatus("processing");
    } catch (err: any) {
      console.error("Convert error:", err);
      toast({ title: "Erro ao iniciar conversão", description: err.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user, isValidUrl, loading, appUrl, checkAccess, consumeCredits]);

  const resetForm = () => {
    setJobStatus("idle");
    setJobId(null);
    setProgress(0);
    setStepLabel("Processando...");
    setErrorMessage(null);
    setAppUrl("");
  };

  return (
    <div className="min-h-screen bg-background">
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature={paywallFeature} />

      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/generator" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Converter para Android (AAB)</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" /> {balance}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <AnimatePresence mode="wait">
          {jobStatus === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-aurora p-8 space-y-6 text-center">
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h2 className="font-display text-2xl font-bold text-foreground">Seu app Android está pronto! 🚀</h2>
              <p className="text-sm text-muted-foreground">Arquivo AAB gerado com sucesso.</p>
              <button onClick={resetForm} className="w-full py-3 bg-muted text-foreground font-display font-semibold rounded-lg border border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Converter outro app
              </button>
            </motion.div>
          )}

          {jobStatus === "error" && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-aurora p-8 space-y-6 text-center">
              <XCircle className="w-16 h-16 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-bold text-foreground">Erro na conversão</h2>
              <p className="text-sm text-muted-foreground">{errorMessage || "Ocorreu um erro inesperado."}</p>
              <button onClick={resetForm} className="w-full py-3 bg-muted text-foreground font-display font-semibold rounded-lg border border-border hover:border-primary/40 transition-all flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4" /> Tentar novamente
              </button>
            </motion.div>
          )}

          {jobStatus === "processing" && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-aurora p-8 space-y-6 text-center">
              <Loader2 className="w-14 h-14 text-primary mx-auto animate-spin" />
              <h2 className="font-display text-xl font-bold text-foreground">{stepLabel}</h2>
              <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{Math.round(Math.min(progress, 100))}%</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{Math.max(1, Math.round((100 - progress) * 0.2 / 10))} min</span>
              </div>
              <p className="text-xs text-muted-foreground">Não feche esta página.</p>
            </motion.div>
          )}

          {jobStatus === "idle" && (
            <motion.form key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleConvert} className="card-aurora space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Smartphone className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">Converter App para Android</h2>
                <p className="text-sm text-muted-foreground mt-1">Cole o link do seu app e receba um arquivo <strong className="text-primary">AAB</strong> pronto para a Play Store</p>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>
                  URL do aplicativo (HTTPS)
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
                  <input type="url" placeholder="https://meuapp.com" value={appUrl} onChange={(e) => setAppUrl(e.target.value)} required pattern="https://.*" className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition" />
                </div>
                {appUrl && !isValidUrl && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1.5"><AlertTriangle className="w-3 h-3" /> Use uma URL válida com HTTPS</p>
                )}
                {isValidUrl && (
                  <p className="text-xs text-primary flex items-center gap-1 mt-1.5"><CheckCircle2 className="w-3 h-3" /> URL válida</p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2">
                <p className="text-xs font-semibold text-foreground">O que o sistema fará:</p>
                {["Validar URL e verificar responsividade", "Criar WebView otimizada para Android", "Configurar fullscreen, splash e navegação", "Gerar APK e converter para AAB", "Disponibilizar download do arquivo final"].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Shield className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Android 8+ compatível</p>
                  <p className="text-xs text-muted-foreground">Scroll fluido, back button funcional, retry automático</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  Essa ação consumirá <span className="font-bold text-foreground">{getCost("convert_aab")} créditos</span>
                  <span className="text-border mx-1">·</span>
                  Saldo: <span className="font-bold text-primary">{balance}</span>
                </p>
              </div>

              <button type="submit" disabled={loading || !isValidUrl} className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Converter para Android (AAB)
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {jobStatus === "idle" && <ConvertInfoBlocks />}
      </div>
    </div>
  );
};

export default ConvertToAAB;
