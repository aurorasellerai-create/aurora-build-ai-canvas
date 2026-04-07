import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Calendar, FileType, CheckCircle2, AlertCircle, Trash2, Loader2, Smartphone, Store, Globe, AlertTriangle, Info, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useCredits } from "@/hooks/useCredits";

const FORMAT_DETAILS: Record<string, { label: string; desc: string; warning?: string; tip?: string }> = {
  apk: {
    label: "APK — Teste Local",
    desc: "Instale diretamente no seu celular Android para testes.",
    warning: "Não é aceito na Google Play Store. Use AAB para publicar.",
  },
  aab: {
    label: "AAB — Google Play",
    desc: "Formato oficial para publicação na Google Play Store.",
    tip: "Envie pelo Google Play Console com sua conta de desenvolvedor.",
  },
  pwa: {
    label: "PWA — App Web",
    desc: "App instalável pelo navegador. Funciona em Android e iPhone.",
    tip: "Distribua diretamente via link, sem loja de aplicativos.",
  },
};

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { balance, consumeCredits, getCost } = useCredits();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user && !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto excluído" });
      navigate("/dashboard");
    },
  });

  const handleDownload = () => {
    if (!project) return;
    const ext = project.format === "pwa" ? "zip" : project.format;
    const blob = new Blob(
      [`Aurora Build AI - ${project.app_name}\nURL: ${project.site_url}\nFormato: ${ext.toUpperCase()}\nGerado em: ${new Date(project.created_at).toLocaleDateString("pt-BR")}`],
      { type: "application/octet-stream" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.app_name.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado!" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Projeto não encontrado.</p>
          <Link to="/dashboard" className="text-primary hover:underline">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  const fmt = FORMAT_DETAILS[project.format] || FORMAT_DETAILS.apk;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">{project.app_name}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
        {/* Status Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          <div className="text-center">
            {project.status === "completed" ? (
              <CheckCircle2 className="w-16 h-16 text-secondary mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            )}
            <h2 className="font-display text-xl font-bold text-foreground">
              {project.status === "completed" ? "App pronto!" : `Status: ${project.status}`}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2"><FileType className="w-4 h-4" /> Formato</span>
              <span className="text-foreground font-semibold uppercase">{project.format}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Criado</span>
              <span className="text-foreground">{new Date(project.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">URL</span>
              <span className="text-secondary text-sm truncate max-w-[200px]">{project.site_url}</span>
            </div>
          </div>
        </motion.div>

        {/* Format Info Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
          <h3 className="font-display font-bold text-sm text-foreground">{fmt.label}</h3>
          <p className="text-xs text-muted-foreground">{fmt.desc}</p>
          {fmt.warning && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0" /> {fmt.warning}
            </p>
          )}
          {fmt.tip && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3 h-3 text-primary shrink-0" /> {fmt.tip}
            </p>
          )}
        </motion.div>

        {/* Export Actions */}
        {project.status === "completed" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
            <h3 className="font-display font-bold text-foreground text-center">Exportar aplicativo</h3>

            <button
              onClick={handleDownload}
              className="w-full py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Baixar {project.format.toUpperCase()}
            </button>

            {project.format === "apk" && (
              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-center">
                <p className="text-xs text-muted-foreground mb-2">
                  Precisa publicar na Play Store? Gere a versão AAB.
                </p>
                <Link
                  to="/generator"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                >
                  <Store className="w-3 h-3" /> Criar versão AAB
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Credit info */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Zap className="w-3 h-3 text-primary" /> Saldo: {balance} créditos
            <span className="text-border mx-1">·</span>
            <Link to="/credits" className="text-primary hover:underline font-semibold">Comprar mais</Link>
          </p>
        </motion.div>

        {/* Monetization CTA */}
        {project.status === "completed" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="p-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 space-y-3 text-center"
          >
            <h3 className="font-display font-bold text-foreground text-lg">
              🚀 Seu app está pronto!
            </h3>
            <p className="text-sm text-muted-foreground">
              Agora você pode:
            </p>
            <ul className="text-sm text-foreground space-y-1">
              <li>✔ Publicar seu app</li>
              <li>✔ Compartilhar com clientes</li>
              <li>✔ <span className="font-bold">Ganhar dinheiro com ele</span></li>
            </ul>

            <div className="pt-3 border-t border-primary/20 space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">
                💰 Quer monetizar seu app automaticamente?
              </p>
              <p className="text-xs text-muted-foreground">
                Conheça o <span className="text-primary font-bold">Aurora Seller AI</span> — sistema completo para afiliados com links automáticos e ganhos recorrentes.
              </p>
              <a
                href="https://aurora-seller.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 text-sm"
              >
                Ativar monetização agora
              </a>
            </div>
          </motion.div>
        )}

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm("Tem certeza que deseja excluir este projeto?")) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
          className="w-full py-3 border border-destructive/30 text-destructive font-semibold rounded-lg hover:bg-destructive/10 transition-all flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" /> Excluir projeto
        </button>

        {project.error_message && (
          <p className="text-destructive text-sm text-center">{project.error_message}</p>
        )}
      </div>
    </div>
  );
};

export default ProjectDetail;
