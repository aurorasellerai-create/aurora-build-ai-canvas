import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Download, Eye, Loader2, CheckCircle2, AlertCircle, Clock, LogOut, Sparkles, Trash2, Crown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ReferralCard from "@/components/ReferralCard";

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", className: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Gerando", className: "text-secondary animate-spin" },
  completed: { icon: CheckCircle2, label: "Pronto", className: "text-secondary" },
  error: { icon: AlertCircle, label: "Erro", className: "text-destructive" },
};

const planLabels = { free: "Free", pro: "Pro", premium: "Premium" };
const planLimits = { free: 1, pro: 5, premium: 999999 };

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Tables<"projects">[];
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto excluído" });
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleDownload = (project: Tables<"projects">) => {
    const ext = project.format === "pwa" ? "zip" : project.format;
    const blob = new Blob([`Aurora Build AI - ${project.app_name}\nURL: ${project.site_url}\nFormato: ${ext.toUpperCase()}`], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.app_name.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const plan = profile?.plan || "free";
  const buildsUsed = profile?.daily_builds_count || 0;
  const buildsLimit = planLimits[plan];
  const isToday = profile?.last_build_date === new Date().toISOString().split("T")[0];
  const currentBuilds = isToday ? buildsUsed : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg text-gradient-gold">Aurora Build AI</Link>
          <div className="flex items-center gap-4">
            <Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Sparkles className="w-4 h-4" /> IA
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</Link>
            <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome + Plan info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Olá, {profile?.display_name || "Usuário"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Plano: <span className="text-primary font-semibold">{planLabels[plan]}</span>
              {plan !== "premium" && (
                <> · Builds hoje: <span className={currentBuilds >= buildsLimit ? "text-destructive" : "text-foreground"}>{currentBuilds}/{buildsLimit}</span></>
              )}
            </p>
          </div>
          {plan !== "premium" && (
            <Link
              to="/pricing"
              className="px-5 py-2.5 bg-primary text-primary-foreground font-display text-sm font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 flex items-center gap-1.5 self-start"
            >
              <Crown className="w-4 h-4" /> Fazer upgrade
            </Link>
          )}
        </motion.div>

        {/* Upsell Banner for free users */}
        {plan === "free" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <p className="text-foreground text-sm font-semibold">Você está usando o plano gratuito</p>
              <p className="text-muted-foreground text-xs">Desbloqueie IA completa, mais builds e recursos premium</p>
            </div>
            <Link
              to="/pricing"
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-bold rounded-lg glow-gold transition-all hover:scale-105 shrink-0 text-center"
            >
              Fazer upgrade
            </Link>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            to="/generator"
            className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Criar novo app
          </Link>
          <Link
            to="/business"
            className="px-6 py-3 border border-primary text-primary font-display font-bold rounded-lg hover:bg-primary/10 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> Criar Negócio com IA
          </Link>
        </div>

        {/* Build limit warning */}
        {plan !== "premium" && currentBuilds >= buildsLimit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <p className="text-foreground font-semibold text-sm">Limite diário atingido!</p>
              <p className="text-muted-foreground text-xs">
                Faça <Link to="/pricing" className="text-primary hover:underline">upgrade</Link> para mais builds.
              </p>
            </div>
          </motion.div>
        )}

        {/* Referral */}
        <div className="mb-8">
          <ReferralCard />
        </div>

        {/* Projects */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-aurora">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Meus Apps</h2>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum app criado ainda. <Link to="/generator" className="text-primary hover:underline">Criar primeiro app</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const StatusIcon = statusConfig[project.status].icon;
                return (
                  <div key={project.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 border border-border gap-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${statusConfig[project.status].className}`} />
                      <div>
                        <p className="font-semibold text-foreground">{project.app_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.format.toUpperCase()} · {statusConfig[project.status].label} · {new Date(project.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {project.status === "completed" && (
                        <button
                          onClick={() => handleDownload(project)}
                          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg glow-gold hover:scale-105 transition-all flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" /> Baixar
                        </button>
                      )}
                      <Link
                        to={`/project/${project.id}`}
                        className="px-4 py-2 border border-border text-foreground text-sm font-semibold rounded-lg hover:border-secondary transition-all flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> Detalhes
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm("Excluir este projeto?")) deleteMutation.mutate(project.id);
                        }}
                        className="px-3 py-2 text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
