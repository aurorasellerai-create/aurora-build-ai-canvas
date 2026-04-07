import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Download, Eye, Loader2, CheckCircle2, AlertCircle, Clock, LogOut, Sparkles } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", className: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Gerando", className: "text-secondary animate-spin" },
  completed: { icon: CheckCircle2, label: "Pronto", className: "text-secondary" },
  error: { icon: AlertCircle, label: "Erro", className: "text-destructive" },
};

const planLabels = { free: "Free", pro: "Pro", premium: "Premium" };

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

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

  const { data: projects = [] } = useQuery({
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg text-gradient-gold">Aurora Build AI</Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos</Link>
            <button onClick={handleSignOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Olá, {profile?.display_name || "Usuário"}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Plano: <span className="text-primary font-semibold">{planLabels[profile?.plan || "free"]}</span>
          </p>
        </motion.div>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            to="/generator"
            className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Criar novo app
          </Link>
          <Link
            to="/tools"
            className="px-6 py-3 border border-secondary text-secondary font-display font-semibold rounded-lg hover:bg-secondary/10 transition-all flex items-center gap-2"
          >
            <Sparkles className="w-5 h-5" /> Ferramentas IA
          </Link>
        </div>

        {/* Projects */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card-aurora">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Seus Apps</h2>
          {projects.length === 0 ? (
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
                      {project.status === "completed" && project.download_url && (
                        <a
                          href={project.download_url}
                          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg glow-gold hover:scale-105 transition-all flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" /> Baixar
                        </a>
                      )}
                      <Link
                        to={`/project/${project.id}`}
                        className="px-4 py-2 border border-border text-foreground text-sm font-semibold rounded-lg hover:border-secondary transition-all flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" /> Detalhes
                      </Link>
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
