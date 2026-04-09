import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Download, Eye, Loader2, CheckCircle2, AlertCircle, Clock,
  LogOut, Sparkles, Trash2, Crown, Zap, TrendingUp, ShieldCheck, RefreshCw,
  History,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ReferralCard from "@/components/ReferralCard";
import CreditHistoryWidget from "@/components/CreditHistoryWidget";

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", className: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Gerando", className: "text-secondary animate-spin" },
  completed: { icon: CheckCircle2, label: "Pronto", className: "text-secondary" },
  error: { icon: AlertCircle, label: "Erro", className: "text-destructive" },
};

const planLabels = { free: "Free", pro: "Pro", premium: "Premium" };
const planLimits = { free: 1, pro: 5, premium: 999999 };
const planCreditDefaults = { free: 5, pro: 50, premium: 500 };

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

  const plan = (profile?.plan || "free") as keyof typeof planLabels;
  const buildsUsed = profile?.daily_builds_count || 0;
  const buildsLimit = planLimits[plan];
  const isToday = profile?.last_build_date === new Date().toISOString().split("T")[0];
  const currentBuilds = isToday ? buildsUsed : 0;

  // Credits
  const creditsBalance = profile?.credits_balance ?? 0;
  const creditsMax = planCreditDefaults[plan];
  const creditPercent = Math.min(100, creditsMax > 0 ? (creditsBalance / creditsMax) * 100 : 0);
  const creditsLow = creditsBalance <= 2;
  const creditsCritical = creditsBalance === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg text-gradient-gold">Aurora Build AI</Link>
          <div className="flex items-center gap-4">
            <Link to="/credits" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Zap className="w-4 h-4" /> Créditos
            </Link>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
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

        {/* Credits Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`mb-6 p-4 rounded-xl border ${
            creditsCritical
              ? "border-destructive/40 bg-destructive/5"
              : creditsLow
              ? "border-yellow-500/30 bg-yellow-500/5"
              : "border-border bg-muted/30"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className={`w-4 h-4 ${creditsCritical ? "text-destructive" : creditsLow ? "text-yellow-500" : "text-primary"}`} />
              <span className="text-sm font-semibold text-foreground">Créditos de IA</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-display font-bold ${
                creditsCritical ? "text-destructive" : creditsLow ? "text-yellow-500" : "text-primary"
              }`}>
                {creditsBalance}
              </span>
              <Link
                to="/credits"
                className="text-xs font-bold text-primary hover:underline"
              >
                + Comprar
              </Link>
            </div>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${creditPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${
                creditsCritical ? "bg-destructive" : creditsLow ? "bg-yellow-500" : "bg-primary"
              }`}
            />
          </div>
          {creditsCritical && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-destructive font-medium animate-pulse">
                ⚠️ Créditos esgotados — suas ações de IA estão bloqueadas
              </p>
              <Link
                to="/credits"
                className="px-4 py-1.5 bg-destructive text-destructive-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-all shrink-0"
              >
                Recarregar agora
              </Link>
            </div>
          )}
          {creditsLow && !creditsCritical && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-yellow-600 font-medium">
                ⚡ Últimos créditos — evite bloqueio
              </p>
              <Link
                to="/credits"
                className="px-4 py-1.5 bg-yellow-500 text-black text-xs font-bold rounded-lg hover:opacity-90 transition-all shrink-0"
              >
                Comprar créditos
              </Link>
            </div>
          )}
        </motion.div>

        {/* Social Proof Banner */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground"
        >
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-primary" />
            +1.247 apps criados esta semana
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-secondary" />
            Usuários PRO criam 3x mais rápido
          </span>
          <span className="hidden sm:inline text-border">•</span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            IA automatizada com resultados reais
          </span>
        </motion.div>

        {/* Upsell Banner for free users */}
        {plan === "free" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mb-6 p-4 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <p className="text-foreground text-sm font-semibold">🔓 Desbloqueie todo o potencial da Aurora</p>
              <p className="text-muted-foreground text-xs">IA completa, mais builds, exportação e publicação — tudo liberado</p>
            </div>
            <Link
              to="/pricing"
              className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-bold rounded-lg glow-gold transition-all hover:scale-105 shrink-0 text-center"
            >
              Desbloquear agora
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
          <Link
            to="/credits"
            className="px-6 py-3 border border-border text-foreground font-display font-bold rounded-lg hover:border-primary/50 transition-all hover:scale-105 flex items-center gap-2"
          >
            <Zap className="w-5 h-5" /> Comprar créditos
          </Link>
          <Link
            to="/historico"
            className="px-6 py-3 border border-border text-foreground font-display font-bold rounded-lg hover:border-primary/50 transition-all hover:scale-105 flex items-center gap-2"
          >
            <History className="w-5 h-5" /> Histórico
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

        {/* Credit History */}
        <CreditHistoryWidget />

        {/* Monetization */}
        {projects.some((p) => p.status === "completed") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-8 p-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div>
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                💰 Monetização
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Seu app já está pronto. Agora transforme-o em fonte de renda.
              </p>
            </div>
            <a
              href="https://auroraseller.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 shrink-0"
            >
              Ativar monetização
            </a>
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

        {/* Bottom upsell - only for non-premium */}
        {plan !== "premium" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center space-y-3"
          >
            <p className="text-xs text-muted-foreground">
              💬 "Desde que ativei o PRO, criei 12 apps e já estou faturando" — <span className="text-foreground">Lucas M.</span>
            </p>
            <p className="text-xs text-muted-foreground">
              💬 "A IA faz em 2 minutos o que levaria horas" — <span className="text-foreground">Ana C.</span>
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
