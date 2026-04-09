import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  ArrowLeft, Download, Clock, CheckCircle2, XCircle,
  Loader2, RefreshCw, Smartphone, ExternalLink
} from "lucide-react";

interface ConversionJob {
  id: string;
  source_url: string;
  status: string;
  progress: number;
  step_label: string | null;
  download_url: string | null;
  error_message: string | null;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  done: { label: "Concluído", icon: CheckCircle2, color: "text-green-400" },
  error: { label: "Erro", icon: XCircle, color: "text-destructive" },
  processing: { label: "Processando", icon: Loader2, color: "text-primary" },
  pending: { label: "Pendente", icon: Clock, color: "text-muted-foreground" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatDuration(ms: number | null) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

function extractDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

const ConversionHistory = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("conversion_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    setJobs((data as ConversionJob[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Histórico de Conversões</h1>
          <button
            onClick={fetchJobs}
            className="ml-auto p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-aurora p-10 text-center space-y-4"
          >
            <Smartphone className="w-14 h-14 text-muted-foreground mx-auto" />
            <h2 className="font-display text-xl font-bold text-foreground">Nenhuma conversão ainda</h2>
            <p className="text-sm text-muted-foreground">Converta seu primeiro app para começar.</p>
            <Link
              to="/converter-app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02]"
            >
              <Smartphone className="w-4 h-4" /> Converter App
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, i) => {
              const cfg = statusConfig[job.status] ?? statusConfig.pending;
              const Icon = cfg.icon;
              const isProcessing = job.status === "processing" || job.status === "pending";

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="card-aurora p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5"
                >
                  {/* Status icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${cfg.color}`}>
                    <Icon className={`w-5 h-5 ${isProcessing ? "animate-spin" : ""}`} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-semibold text-foreground text-sm truncate max-w-[220px]">
                        {extractDomain(job.source_url)}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                        job.status === "done"
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : job.status === "error"
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : "border-primary/30 bg-primary/10 text-primary"
                      }`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(job.created_at)}
                      </span>
                      {job.processing_time_ms && (
                        <span>⏱ {formatDuration(job.processing_time_ms)}</span>
                      )}
                    </div>
                    {job.error_message && (
                      <p className="text-xs text-destructive/80 truncate">{job.error_message}</p>
                    )}
                    {isProcessing && (
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(job.progress, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {job.download_url && job.status === "done" && (
                      <a
                        href={job.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-download-3d !py-2.5 !px-4 !text-sm !rounded-lg flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Baixar</span>
                      </a>
                    )}
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Abrir site original"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionHistory;
