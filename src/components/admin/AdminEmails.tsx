import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Loader2, Search, CheckCircle, XCircle, Clock, Filter } from "lucide-react";

const templateLabels: Record<string, string> = {
  welcome: "Boas-vindas",
  "plan-confirmation": "Confirmação de Plano",
  "credit-purchase": "Compra de Créditos",
  "password-reset": "Redefinir Senha",
  "app-ready": "App Pronto",
  "app-failed": "Falha no App",
  "plan-renewal": "Renovação de Plano",
  "plan-cancelled": "Cancelamento de Plano",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  sent: { label: "Enviado", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: CheckCircle },
  failed: { label: "Falhou", color: "text-red-400 bg-red-500/10 border-red-500/20", icon: XCircle },
  pending: { label: "Pendente", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: Clock },
};

const PERIODS = [
  { label: "24h", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
];

const AdminEmails = ({ enabled }: { enabled: boolean }) => {
  const [period, setPeriod] = useState(7);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-emails", period],
    queryFn: async () => {
      const since = new Date(Date.now() - period * 86400000).toISOString();
      const { data: logs, error } = await supabase
        .from("email_logs" as any)
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return logs as any[];
    },
    enabled,
    staleTime: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const logs = data || [];

  const templates = [...new Set(logs.map((l: any) => l.template_name))];

  const filtered = logs.filter((log: any) => {
    const matchTemplate = templateFilter === "all" || log.template_name === templateFilter;
    const matchStatus = statusFilter === "all" || log.status === statusFilter;
    const matchSearch =
      !search ||
      log.recipient_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.template_name?.toLowerCase().includes(search.toLowerCase());
    return matchTemplate && matchStatus && matchSearch;
  });

  const totalSent = logs.filter((l: any) => l.status === "sent").length;
  const totalFailed = logs.filter((l: any) => l.status === "failed").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Mail className="w-6 h-6 text-primary" />
        <h2 className="font-display text-xl font-bold text-foreground">E-mails Enviados</h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-aurora p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{logs.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="card-aurora p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{totalSent}</p>
          <p className="text-xs text-muted-foreground">Enviados</p>
        </div>
        <div className="card-aurora p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{totalFailed}</p>
          <p className="text-xs text-muted-foreground">Falharam</p>
        </div>
        <div className="card-aurora p-4 text-center">
          <p className="text-2xl font-bold text-primary">{templates.length}</p>
          <p className="text-xs text-muted-foreground">Templates</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              onClick={() => setPeriod(p.days)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                period === p.days
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Template filter */}
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"
        >
          <option value="all">Todos os templates</option>
          {templates.map((t: string) => (
            <option key={t} value={t}>
              {templateLabels[t] || t}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground"
        >
          <option value="all">Todos os status</option>
          <option value="sent">Enviados</option>
          <option value="failed">Falharam</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card-aurora overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Template</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Destinatário</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum e-mail encontrado neste período
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 100).map((log: any) => {
                  const sc = statusConfig[log.status] || statusConfig.pending;
                  const Icon = sc.icon;
                  return (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-foreground">
                          {templateLabels[log.template_name] || log.template_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{log.recipient_email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${sc.color}`}>
                          <Icon className="w-3 h-3" />
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground text-center">
            Mostrando 100 de {filtered.length} registros
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmails;
