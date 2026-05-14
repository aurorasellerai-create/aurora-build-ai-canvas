import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, ShieldOff, KeyRound, Smartphone, History,
  AlertTriangle, MapPin, Activity, Loader2, CheckCircle2, XCircle,
  Globe, UserCog, Download, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import Admin2FASetup from "./Admin2FASetup";

interface AdminSectionProps { enabled?: boolean }

const sevColor: Record<string, string> = {
  info: "border-secondary/30 bg-secondary/5 text-secondary",
  warn: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
};

const kindLabel: Record<string, string> = {
  new_ip: "IP novo detectado",
  new_country: "País novo",
  brute_force: "Força bruta",
  "2fa_failed": "Falha 2FA",
  impossible_travel: "Viagem impossível",
};

const actionLabel: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  "2fa_enable": "2FA ativado",
  "2fa_disable": "2FA desativado",
  update: "Atualização",
  delete: "Exclusão",
  role_change: "Alteração de papel",
  credit_grant: "Concessão de créditos",
  setting_change: "Configuração",
};

const truncate = (s: string | null | undefined, n = 40) =>
  !s ? "—" : s.length > n ? s.slice(0, n) + "…" : s;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const StatCard = ({ icon: Icon, label, value, accent = "primary" }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-5"
  >
    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl opacity-30 ${accent === "primary" ? "bg-primary" : accent === "danger" ? "bg-destructive" : "bg-secondary"}`} />
    <div className="relative flex items-center justify-between mb-2">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent === "primary" ? "bg-primary/10 text-primary" : accent === "danger" ? "bg-destructive/10 text-destructive" : "bg-secondary/10 text-secondary"}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="relative text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-bold">{label}</p>
    <p className="relative font-display text-2xl font-bold text-foreground mt-1">{value}</p>
  </motion.div>
);

const AdminSecurity = ({ enabled = true }: AdminSectionProps) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [tab, setTab] = useState<"alerts" | "logins" | "audit">("alerts");

  const { data: tfa, isLoading: loadingTfa } = useQuery({
    queryKey: ["admin-2fa-status", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("admin_2fa")
        .select("enabled, last_used_at, backup_codes")
        .eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && enabled,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["security-alerts"],
    queryFn: async () => {
      const { data } = await supabase.from("security_alerts")
        .select("*").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
    enabled,
    refetchInterval: 30_000,
  });

  const { data: logins = [] } = useQuery({
    queryKey: ["login-attempts"],
    queryFn: async () => {
      const { data } = await supabase.from("login_attempts")
        .select("*").order("attempted_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled,
  });

  const { data: audit = [] } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: async () => {
      const { data } = await supabase.from("admin_audit_log")
        .select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled,
  });

  const ackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("acknowledge_security_alert", { p_alert_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["security-alerts"] });
      toast({ title: "Alerta reconhecido" });
    },
  });

  const disable2FA = async () => {
    const code = prompt("Digite o código TOTP atual ou um código de backup para desativar:");
    if (!code) return;
    const { data, error } = await supabase.functions.invoke("admin-2fa-disable", { body: { code } });
    if (error || data?.error) {
      toast({ title: "Erro", description: data?.error || error?.message, variant: "destructive" });
    } else {
      toast({ title: "2FA desativado" });
      qc.invalidateQueries({ queryKey: ["admin-2fa-status"] });
    }
  };

  const exportAudit = () => {
    const rows = [["data", "admin", "ação", "alvo", "ip", "user_agent"]];
    audit.forEach((a: any) => rows.push([
      fmtDate(a.created_at), a.admin_id, a.action, `${a.target_type ?? ""}:${a.target_id ?? ""}`, a.ip ?? "", a.user_agent ?? ""
    ]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `audit-${Date.now()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const unackAlerts = alerts.filter((a: any) => !a.acknowledged);
  const criticalAlerts = unackAlerts.filter((a: any) => a.severity === "critical");
  const last24h = logins.filter((l: any) => new Date(l.attempted_at).getTime() > Date.now() - 86400000);
  const uniqueIps = new Set(logins.map((l: any) => l.ip).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card/80 to-background p-6">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-secondary/20 blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground">Centro de Segurança</h2>
            <p className="text-sm text-muted-foreground">Monitoramento, auditoria e controle de acesso administrativo</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Logins 24h" value={last24h.length} />
        <StatCard icon={AlertTriangle} label="Alertas pendentes" value={unackAlerts.length} accent={unackAlerts.length > 0 ? "danger" : "secondary"} />
        <StatCard icon={ShieldAlert} label="Críticos" value={criticalAlerts.length} accent="danger" />
        <StatCard icon={Globe} label="IPs únicos (50 últ)" value={uniqueIps} accent="secondary" />
      </div>

      {/* 2FA Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/60 bg-card/40 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${tfa?.enabled ? "bg-secondary/10 border-secondary/30 text-secondary" : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300"}`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-foreground">Autenticação de dois fatores</h3>
                {loadingTfa ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> :
                  tfa?.enabled ? <span className="text-[10px] uppercase font-bold text-secondary">ativo</span> :
                  <span className="text-[10px] uppercase font-bold text-yellow-300">recomendado</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tfa?.enabled
                  ? `${(tfa.backup_codes as any[])?.length ?? 0} códigos de backup restantes${tfa.last_used_at ? ` · último uso ${fmtDate(tfa.last_used_at)}` : ""}`
                  : "Ative para exigir um código TOTP no login do painel."}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {tfa?.enabled ? (
              <button onClick={disable2FA} className="px-4 py-2 border border-destructive/30 text-destructive text-sm font-bold rounded-lg hover:bg-destructive/10 flex items-center gap-2">
                <ShieldOff className="w-4 h-4" /> Desativar
              </button>
            ) : (
              <button onClick={() => setShow2FAModal(true)} className="px-4 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg glow-gold hover:scale-[1.02] transition-all flex items-center gap-2">
                <KeyRound className="w-4 h-4" /> Configurar 2FA
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {([
          ["alerts", "Alertas", AlertTriangle, unackAlerts.length],
          ["logins", "Tentativas de Login", History, 0],
          ["audit", "Auditoria de Ações", UserCog, 0],
        ] as const).map(([k, label, Icon, badge]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all ${
              tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="w-4 h-4" /> {label}
            {badge > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-destructive text-destructive-foreground">{badge}</span>}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {tab === "alerts" && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-secondary opacity-60" />
              Nenhum alerta de segurança até agora.
            </div>
          ) : alerts.map((a: any) => (
            <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 ${sevColor[a.severity] || sevColor.info} ${!a.acknowledged && a.severity === "critical" ? "animate-pulse" : ""}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">{kindLabel[a.kind] || a.kind}</p>
                  <p className="text-xs opacity-80 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.ip || "—"} {a.details?.country ? `(${a.details.country})` : ""}</span>
                    <span>{fmtDate(a.created_at)}</span>
                    {a.user_agent && <span className="text-muted-foreground">{truncate(a.user_agent, 40)}</span>}
                  </p>
                </div>
              </div>
              {!a.acknowledged && (
                <button onClick={() => ackMutation.mutate(a.id)} disabled={ackMutation.isPending}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-background/40 border border-current hover:bg-background/60 self-start sm:self-center">
                  Reconhecer
                </button>
              )}
              {a.acknowledged && <span className="text-xs opacity-60 italic">reconhecido</span>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Logins Tab */}
      {tab === "logins" && (
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">E-mail</th>
                <th className="px-4 py-2 text-left">IP</th>
                <th className="px-4 py-2 text-left hidden md:table-cell">User-Agent</th>
                <th className="px-4 py-2 text-left">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {logins.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/20">
                  <td className="px-4 py-2">
                    {l.success
                      ? <CheckCircle2 className="w-4 h-4 text-secondary" />
                      : <XCircle className="w-4 h-4 text-destructive" />}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{l.email}</td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{l.ip || l.ip_hint || "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{truncate(l.user_agent, 50)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(l.attempted_at)}</td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Sem registros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Audit Tab */}
      {tab === "audit" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={exportAudit} className="px-3 py-1.5 text-xs font-bold border border-border rounded-lg hover:border-primary flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          </div>
          <div className="rounded-2xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Ação</th>
                  <th className="px-4 py-2 text-left hidden md:table-cell">Alvo</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {audit.map((a: any) => (
                  <tr key={a.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/30">{actionLabel[a.action] || a.action}</span></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground hidden md:table-cell">{a.target_type ? `${a.target_type}:${truncate(a.target_id, 20)}` : "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{a.ip || "—"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(a.created_at)}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">Sem ações registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      <AnimatePresence>
        {show2FAModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShow2FAModal(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
              <Admin2FASetup
                onSuccess={() => { setShow2FAModal(false); qc.invalidateQueries({ queryKey: ["admin-2fa-status"] }); }}
                onCancel={() => setShow2FAModal(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSecurity;
