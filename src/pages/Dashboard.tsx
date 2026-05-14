import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Download, Eye, Loader2, CheckCircle2, AlertCircle, Clock,
  LogOut, Sparkles, Trash2, Crown, Zap, ShieldCheck, RefreshCw,
  ShieldAlert, Brain, Package,
  Rocket, ArrowUpRight, Activity, Smartphone,
} from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "@/hooks/use-toast";
import ReferralCard from "@/components/ReferralCard";
import CreditHistoryWidget from "@/components/CreditHistoryWidget";
import { getValidatorHistory, reexecuteValidatorHistoryItem, validatorStatusLabel, type ValidatorHistoryItem } from "@/lib/validatorHistory";
import { setSelectedAppFormatPreference } from "@/lib/appFormatPreference";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

const statusConfig = {
  pending: { icon: Clock, label: "Pendente", className: "text-muted-foreground" },
  processing: { icon: Loader2, label: "Gerando", className: "text-secondary animate-spin" },
  completed: { icon: CheckCircle2, label: "Pronto", className: "text-secondary" },
  error: { icon: AlertCircle, label: "Erro", className: "text-destructive" },
};

const planLabels = { free: "Free", pro: "Pro", premium: "Premium" };
const planLimits = { free: 1, pro: 5, premium: 999999 };
const planCreditDefaults = { free: 5, pro: 50, premium: 500 };

const validatorStatusClasses = {
  approved: "text-secondary border-secondary/25 bg-secondary/5",
  warning: "text-primary border-primary/25 bg-primary/5",
  blocked: "text-destructive border-destructive/25 bg-destructive/5",
};

/* ============================================================
   Animated Stat Card
============================================================ */
const StatCard = ({
  label, value, sub, icon: Icon, accent = "primary", delay = 0,
}: {
  label: string; value: string | number; sub?: string; icon: any;
  accent?: "primary" | "secondary"; delay?: number;
}) => {
  const isPrimary = accent === "primary";
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-5 transition-all hover:border-primary/40"
    >
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${isPrimary ? "bg-primary" : "bg-secondary"}`} />
      <div className="relative flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrimary ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:rotate-12 transition-all" />
      </div>
      <p className="relative text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold mb-1">{label}</p>
      <p className={`relative font-display text-3xl font-bold ${isPrimary ? "text-foreground" : "text-gradient-cyan"}`}>{value}</p>
      {sub && <p className="relative text-xs text-muted-foreground mt-1.5">{sub}</p>}
    </motion.div>
  );
};

/* ============================================================
   Section Card (Firebase, APIs, etc.)
============================================================ */
const SectionCard = ({
  id, icon: Icon, title, description, status, accent, action, delay = 0,
}: {
  id: string; icon: any; title: string; description: string;
  status: string; accent: "primary" | "secondary";
  action: { label: string; to: string; external?: boolean };
  delay?: number;
}) => {
  const isPrimary = accent === "primary";
  const ActionTag: any = action.external ? "a" : Link;
  const actionProps = action.external
    ? { href: action.to, target: "_blank", rel: "noopener noreferrer" }
    : { to: action.to };

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay, duration: 0.5 }}
      className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card to-card/40 p-6 hover:border-primary/40 transition-all scroll-mt-20"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${isPrimary ? "bg-gradient-to-br from-primary/5 via-transparent to-transparent" : "bg-gradient-to-br from-secondary/5 via-transparent to-transparent"}`} />

      <div className="relative flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${isPrimary ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/10 border-secondary/30 text-secondary"}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground text-lg leading-tight">{title}</h3>
            <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] uppercase font-bold tracking-wider ${isPrimary ? "text-primary" : "text-secondary"}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isPrimary ? "bg-primary" : "bg-secondary"}`} />
              {status}
            </span>
          </div>
        </div>
      </div>

      <p className="relative text-sm text-muted-foreground leading-relaxed mb-5 min-h-[2.5rem]">
        {description}
      </p>

      <ActionTag
        {...actionProps}
        className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.03] ${
          isPrimary
            ? "bg-primary text-primary-foreground glow-gold"
            : "bg-secondary text-secondary-foreground glow-cyan"
        }`}
      >
        {action.label} <ArrowUpRight className="w-3.5 h-3.5" />
      </ActionTag>
    </motion.div>
  );
};

/* ============================================================
   Dashboard
============================================================ */
const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [validatorHistory, setValidatorHistory] = useState<ValidatorHistoryItem[]>(() => getValidatorHistory());

  useEffect(() => {
    const syncHistory = () => setValidatorHistory(getValidatorHistory());
    window.addEventListener("aurora-validator-history-updated", syncHistory);
    window.addEventListener("storage", syncHistory);
    return () => {
      window.removeEventListener("aurora-validator-history-updated", syncHistory);
      window.removeEventListener("storage", syncHistory);
    };
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
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

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleDownload = (project: Tables<"projects">) => {
    if (project.download_url) window.open(project.download_url, "_blank", "noopener,noreferrer");
    else toast({ title: "Download indisponível", description: "O arquivo ainda não está pronto.", variant: "destructive" });
  };

  const handleReexecuteValidation = (item: ValidatorHistoryItem) => {
    if (item.appFormat) setSelectedAppFormatPreference(item.appFormat);
    const nextValidation = reexecuteValidatorHistoryItem(item);
    toast({ title: "Validação reexecutada", description: "O diagnóstico anterior foi reutilizado como base." });
    navigate(`/validator/${nextValidation.id}`);
  };

  const plan = (profile?.plan || "free") as keyof typeof planLabels;
  const buildsUsed = profile?.daily_builds_count || 0;
  const buildsLimit = planLimits[plan];
  const isToday = profile?.last_build_date === new Date().toISOString().split("T")[0];
  const currentBuilds = isToday ? buildsUsed : 0;

  const creditsBalance = profile?.credits_balance ?? 0;
  const creditsMax = planCreditDefaults[plan];
  const creditPercent = Math.min(100, creditsMax > 0 ? (creditsBalance / creditsMax) * 100 : 0);
  const creditsLow = creditsBalance <= 2;
  const creditsCritical = creditsBalance === 0;

  const stats = useMemo(() => {
    const completed = projects.filter(p => p.status === "completed").length;
    const processing = projects.filter(p => p.status === "processing" || p.status === "pending").length;
    return { total: projects.length, completed, processing };
  }, [projects]);

  const initials = (profile?.display_name || user?.email || "U").slice(0, 2).toUpperCase();

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full bg-background relative overflow-hidden">
        {/* Ambient background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-secondary/5 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-3xl" />
        </div>

        <DashboardSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <header className="sticky top-0 z-30 h-16 px-4 md:px-6 flex items-center gap-4 border-b border-border/60 bg-background/70 backdrop-blur-xl">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <Link
                to="/credits"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all text-xs font-bold text-primary"
                title="Créditos"
              >
                <Zap className="w-3.5 h-3.5" /> {creditsBalance}
              </Link>

              {/* Profile */}
              <div className="flex items-center gap-2 pl-2 ml-1 border-l border-border/60">
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary p-[1.5px]">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-display font-bold text-xs text-foreground">
                    {initials}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-secondary border-2 border-background" />
                </div>
                <div className="hidden md:block leading-tight">
                  <p className="text-xs font-bold text-foreground truncate max-w-[180px]">
                    {profile?.display_name || user?.email?.split("@")[0] || "—"}
                  </p>
                  <p className="text-[10px] text-primary font-bold uppercase tracking-wider">{planLabels[plan]}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sair"
                  className="ml-1 w-9 h-9 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all flex items-center justify-center"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8">

              {/* Hero Welcome */}
              <motion.section
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-border/60 p-6 md:p-8 bg-gradient-to-br from-card via-card/80 to-background"
              >
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-secondary/20 blur-3xl" />
                </div>
                <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 text-[10px] font-bold uppercase tracking-wider text-secondary mb-3">
                      <Activity className="w-3 h-3" /> Sistema Operacional
                    </div>
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight">
                      Olá, <span className="text-gradient-gold">{profile?.display_name?.split(" ")[0] || "Criador"}</span>
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-xl">
                      Bem-vindo ao seu centro de comando. Crie, publique e monetize apps com IA — tudo em um só lugar.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to="/generator"
                      className="px-5 py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-xl glow-gold glow-gold-hover transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Criar app
                    </Link>
                    <Link
                      to="/business"
                      className="px-5 py-3 border border-secondary/40 text-secondary font-display font-bold text-sm rounded-xl hover:bg-secondary/10 transition-all hover:scale-105 flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" /> Negócio com IA
                    </Link>
                  </div>
                </div>
              </motion.section>

              {/* Stats */}
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="Apps Totais" value={stats.total} sub={`${stats.completed} prontos`} icon={Smartphone} delay={0.05} />
                  <StatCard label="Em Produção" value={stats.processing} sub="processando" icon={Loader2} accent="secondary" delay={0.1} />
                  <StatCard label="Builds Hoje" value={`${currentBuilds}/${plan === "premium" ? "∞" : buildsLimit}`} sub={`Plano ${planLabels[plan]}`} icon={Rocket} delay={0.15} />
                  <StatCard label="Créditos IA" value={creditsBalance} sub={`${creditPercent.toFixed(0)}% do limite`} icon={Zap} accent="secondary" delay={0.2} />
                </div>
              </section>

              {/* Credits Bar */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
                className={`rounded-2xl border p-5 ${
                  creditsCritical ? "border-destructive/40 bg-destructive/5"
                    : creditsLow ? "border-yellow-500/30 bg-yellow-500/5"
                    : "border-border/60 bg-card/40"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className={`w-4 h-4 ${creditsCritical ? "text-destructive" : creditsLow ? "text-yellow-500" : "text-primary"}`} />
                    <span className="text-sm font-bold text-foreground">Saldo de Créditos IA</span>
                  </div>
                  <Link to="/credits" className="text-xs font-bold text-primary hover:underline">+ Comprar</Link>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${creditPercent}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
                    className={`h-full rounded-full ${creditsCritical ? "bg-destructive" : creditsLow ? "bg-yellow-500" : "bg-gradient-to-r from-primary to-secondary"}`}
                  />
                </div>
                {creditsCritical && (
                  <p className="text-xs text-destructive font-medium mt-3 animate-pulse">⚠️ Créditos esgotados — recarregue para continuar.</p>
                )}
              </motion.div>

              {/* Criação de Apps */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-foreground">Área de Criação</h2>
                  <Link to="/generator" className="text-xs text-secondary hover:underline font-bold">Ver tudo →</Link>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <SectionCard
                    id="criar-app"
                    icon={Rocket}
                    title="Criar do Zero"
                    description="Use a IA da Aurora para gerar um app completo a partir de uma ideia."
                    status="Disponível"
                    accent="primary"
                    action={{ label: "Iniciar criação", to: "/generator" }}
                    delay={0.05}
                  />
                  <SectionCard
                    id="converter"
                    icon={Smartphone}
                    title="Converter Site"
                    description="Transforme qualquer URL em um app Android nativo com PWA otimizada."
                    status="Disponível"
                    accent="secondary"
                    action={{ label: "Converter agora", to: "/generator/site" }}
                    delay={0.1}
                  />
                  <SectionCard
                    id="negocio-ia"
                    icon={Brain}
                    title="Negócio com IA"
                    description="Gere um plano de negócios completo e transforme em app pronto para vender."
                    status="Premium"
                    accent="primary"
                    action={{ label: "Gerar negócio", to: "/business" }}
                    delay={0.15}
                  />
                </div>
              </section>

              {/* Integrações */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-foreground">Integrações</h2>
                  <span className="text-[10px] uppercase tracking-wider text-secondary font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" /> 3 ativas
                  </span>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <SectionCard
                    id="firebase"
                    icon={Flame}
                    title="Firebase"
                    description="Autenticação, banco em tempo real e push notifications nativos."
                    status="Conectado"
                    accent="primary"
                    action={{ label: "Configurar", to: "/tools" }}
                    delay={0.05}
                  />
                  <SectionCard
                    id="apis"
                    icon={Plug}
                    title="APIs Externas"
                    description="Conecte Stripe, OpenAI, Google e webhooks personalizados ao seu app."
                    status="Pronto"
                    accent="secondary"
                    action={{ label: "Conectar API", to: "/tools" }}
                    delay={0.1}
                  />
                  <SectionCard
                    id="publicacoes"
                    icon={Send}
                    title="Publicações"
                    description="Publique direto na Play Store, App Store ou link próprio em minutos."
                    status="Auto-deploy"
                    accent="primary"
                    action={{ label: "Publicar", to: "/historico" }}
                    delay={0.15}
                  />
                </div>
              </section>

              {/* IA & APK */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold text-foreground">Inteligência & Build</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <SectionCard
                    id="ia"
                    icon={Brain}
                    title="IA / OpenAI"
                    description="Geração de conteúdo, código, copy e validação semântica usando GPT-5 e Gemini Pro."
                    status="Online"
                    accent="secondary"
                    action={{ label: "Abrir ferramentas IA", to: "/tools" }}
                    delay={0.05}
                  />
                  <SectionCard
                    id="apk"
                    icon={Package}
                    title="Geração APK Android"
                    description="Worker dedicado converte seu projeto em AAB/APK assinado pronto para Play Store."
                    status="Worker ativo"
                    accent="primary"
                    action={{ label: "Gerar APK", to: "/generator/convert-aab" }}
                    delay={0.1}
                  />
                </div>
              </section>

              {/* Validador */}
              <motion.section
                id="validador"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border/60 bg-card/40 p-6 scroll-mt-20"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-primary" /> Histórico de Validações
                  </h2>
                  <Link to="/#aurora-validator" className="text-xs text-primary hover:underline font-bold">Nova validação →</Link>
                </div>

                {validatorHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Nenhuma validação executada ainda. <Link to="/#aurora-validator" className="text-primary hover:underline">Validar meu app</Link>
                  </p>
                ) : (
                  <div className="space-y-3">
                    {validatorHistory.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-foreground">{item.appName}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {(item.appFormat ?? "apk").toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end flex-wrap">
                          <span className={`px-3 py-1 rounded-full border text-xs font-bold ${validatorStatusClasses[item.status]}`}>
                            {validatorStatusLabel[item.status]}
                          </span>
                          <button onClick={() => handleReexecuteValidation(item)} className="px-3 py-1.5 border border-primary/30 text-primary text-xs font-bold rounded-lg hover:bg-primary/10 transition-all flex items-center gap-1">
                            <RefreshCw className="w-3.5 h-3.5" /> Reexecutar
                          </button>
                          <Link to={`/validator/${item.id}`} onClick={() => item.appFormat && setSelectedAppFormatPreference(item.appFormat)} className="px-3 py-1.5 border border-border text-foreground text-xs font-bold rounded-lg hover:border-secondary transition-all flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> Diagnóstico
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Credit History + Referral */}
              <div className="grid lg:grid-cols-2 gap-6">
                <CreditHistoryWidget />
                <ReferralCard />
              </div>

              {/* Projects */}
              <motion.section
                id="apps"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="rounded-2xl border border-border/60 bg-card/40 p-6 scroll-mt-20"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-secondary" /> Meus Apps
                  </h2>
                  <Link
                    to="/generator"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Novo
                  </Link>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <Rocket className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground mb-4">Você ainda não criou nenhum app.</p>
                    <Link to="/generator" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm glow-gold hover:scale-105 transition-all">
                      <Plus className="w-4 h-4" /> Criar primeiro app
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => {
                      const StatusIcon = statusConfig[project.status].icon;
                      return (
                        <motion.div
                          key={project.id}
                          whileHover={{ x: 2 }}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/60 hover:border-primary/30 transition-all gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-card border border-border/60 flex items-center justify-center">
                              <StatusIcon className={`w-4 h-4 ${statusConfig[project.status].className}`} />
                            </div>
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
                                className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg glow-gold hover:scale-105 transition-all flex items-center gap-1"
                              >
                                <Download className="w-3.5 h-3.5" /> Baixar
                              </button>
                            )}
                            <Link
                              to={`/project/${project.id}`}
                              className="px-3 py-1.5 border border-border text-foreground text-xs font-bold rounded-lg hover:border-secondary transition-all flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" /> Detalhes
                            </Link>
                            <button
                              onClick={() => { if (confirm("Excluir este projeto?")) deleteMutation.mutate(project.id); }}
                              className="px-2 py-1.5 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.section>

              {/* Build limit warning */}
              {plan !== "premium" && currentBuilds >= buildsLimit && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl bg-destructive/10 border border-destructive/30 p-4 flex items-center gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="text-foreground font-semibold text-sm">Limite diário atingido</p>
                    <p className="text-muted-foreground text-xs">
                      Faça <Link to="/pricing" className="text-primary hover:underline font-bold">upgrade</Link> para builds ilimitados.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Monetization */}
              {projects.some((p) => p.status === "completed") && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-secondary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-lg">
                      <Crown className="w-5 h-5 text-primary" /> Monetize seu app
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Seu app já está pronto. Transforme em fonte de renda com Aurora Seller.
                    </p>
                  </div>
                  <a
                    href="https://auroraseller.com.br"
                    target="_blank" rel="noopener noreferrer"
                    className="px-6 py-3 bg-primary text-primary-foreground font-display font-bold text-sm rounded-xl glow-gold glow-gold-hover hover:scale-105 transition-all shrink-0"
                  >
                    Ativar agora
                  </a>
                </motion.div>
              )}

              {/* Footer trust */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground pt-4 pb-8 border-t border-border/40">
                <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3 text-primary" /> +1.247 apps esta semana</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3 text-secondary" /> 100% seguro</span>
                <span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-primary" /> IA em tempo real</span>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
