import { useState, useEffect } from "react";
import { useAdminFinancial } from "./useAdminData";
import { DollarSign, Loader2, Zap, RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const EVENT_ICONS: Record<string, { icon: typeof CheckCircle; color: string }> = {
  info: { icon: CheckCircle, color: "text-secondary" },
  warning: { icon: AlertTriangle, color: "text-yellow-500" },
  error: { icon: XCircle, color: "text-destructive" },
  critical: { icon: XCircle, color: "text-destructive" },
};

const AdminFinancial = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminFinancial(enabled);
  const [tab, setTab] = useState<"payments" | "credits" | "kiwify">("payments");
  const queryClient = useQueryClient();

  // Realtime subscription for webhook events
  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel("admin-kiwify-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "system_logs",
          filter: "category=eq.webhook",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin-financial"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const fmt = (v: number) => `R$ ${(v / 100).toFixed(2)}`;

  const revenueByMonth = data?.revenueByMonth || {};
  const chartData = Object.entries(revenueByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, amount]) => ({
      month: month.substring(5) + "/" + month.substring(2, 4),
      receita: (amount as number) / 100,
    }));

  const kiwifyLogs = data?.kiwifyLogs || [];
  const kiwifyStats = data?.kiwifyStats || { total: 0, approved: 0, cancelled: 0 };

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-primary" /> Financeiro
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card-aurora p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Receita Total</p>
          <p className="text-2xl font-display font-bold text-primary">{fmt(data?.totalRevenue || 0)}</p>
        </div>
        <div className="card-aurora p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Receita Mensal</p>
          <p className="text-2xl font-display font-bold text-foreground">{fmt(data?.monthlyRevenue || 0)}</p>
        </div>
        <div className="card-aurora p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Ticket Médio</p>
          <p className="text-2xl font-display font-bold text-foreground">{fmt(data?.ticketMedio || 0)}</p>
        </div>
        <div className="card-aurora p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Transações</p>
          <p className="text-2xl font-display font-bold text-foreground">{data?.totalTransactions || 0}</p>
        </div>
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="card-aurora p-5">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Receita por mês</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Receita"]}
                />
                <Bar dataKey="receita" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "payments" as const, label: "Pagamentos", count: (data?.payments || []).length },
          { id: "credits" as const, label: "Compras de créditos", count: (data?.creditPurchases || []).length },
          { id: "kiwify" as const, label: "🔴 Kiwify Live", count: kiwifyStats.total },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Payments table */}
      {tab === "payments" && (
        <div className="card-aurora p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Plano</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Valor</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Status</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Provider</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Data</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payments || []).slice(0, 50).map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 text-foreground capitalize">{p.plan}</td>
                    <td className="px-3 py-2 text-center text-foreground">{fmt(p.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.status === "approved" ? "bg-secondary/10 text-secondary" :
                        p.status === "refunded" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground text-xs">{p.provider}</td>
                    <td className="px-3 py-2 text-center text-muted-foreground text-xs">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Credit purchases table */}
      {tab === "credits" && (
        <div className="card-aurora p-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Pacote</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Créditos</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Valor</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Status</th>
                  <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Data</th>
                </tr>
              </thead>
              <tbody>
                {(data?.creditPurchases || []).slice(0, 50).map((p: any) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-2 text-foreground">{p.package_name}</td>
                    <td className="px-3 py-2 text-center text-primary font-bold">{p.credits_amount}</td>
                    <td className="px-3 py-2 text-center text-foreground">{fmt(p.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        p.status === "approved" ? "bg-secondary/10 text-secondary" : "bg-muted text-muted-foreground"
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-3 py-2 text-center text-muted-foreground text-xs">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Kiwify Live Panel */}
      {tab === "kiwify" && (
        <div className="space-y-4">
          {/* Kiwify Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card-aurora p-4 text-center">
              <p className="text-2xl font-display font-bold text-primary">{kiwifyStats.total}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Eventos total</p>
            </div>
            <div className="card-aurora p-4 text-center">
              <p className="text-2xl font-display font-bold text-secondary">{kiwifyStats.approved}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Aprovados</p>
            </div>
            <div className="card-aurora p-4 text-center">
              <p className="text-2xl font-display font-bold text-destructive">{kiwifyStats.cancelled}</p>
              <p className="text-xs text-muted-foreground uppercase font-semibold">Cancelados</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span>Atualização em tempo real via Realtime</span>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-financial"] })}
              className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>

          {/* Kiwify event timeline */}
          <div className="card-aurora p-5">
            <h3 className="font-display font-bold text-foreground mb-4 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Timeline de Eventos Kiwify
            </h3>

            {kiwifyLogs.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum evento de webhook registrado ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Os eventos aparecerão aqui em tempo real quando o webhook Kiwify receber dados</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {kiwifyLogs.map((log: any) => {
                  const evtConfig = EVENT_ICONS[log.severity] || EVENT_ICONS.info;
                  const Icon = evtConfig.icon;
                  const details = log.details || {};

                  return (
                    <div key={log.id} className="relative pl-8 pb-3 border-l-2 border-border/50 last:border-0">
                      {/* Timeline dot */}
                      <div className={`absolute left-[-9px] top-0.5 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${
                        log.severity === "error" || log.severity === "critical"
                          ? "bg-destructive"
                          : log.message?.includes("cancelad") || log.message?.includes("rebaixad")
                          ? "bg-yellow-500"
                          : "bg-secondary"
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      <div className="card-aurora p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Icon className={`w-3.5 h-3.5 ${evtConfig.color} shrink-0`} />
                              <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                                log.severity === "error" ? "bg-destructive/10 text-destructive" :
                                log.severity === "warning" ? "bg-yellow-500/10 text-yellow-500" :
                                "bg-secondary/10 text-secondary"
                              }`}>
                                {log.severity}
                              </span>
                              {log.email && (
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {log.email}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground font-medium">{log.message}</p>

                            {/* Details */}
                            {Object.keys(details).length > 0 && (
                              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                                {details.order_id && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Pedido: </span>
                                    <span className="text-foreground font-mono">{details.order_id}</span>
                                  </div>
                                )}
                                {details.plan && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Plano: </span>
                                    <span className="text-foreground capitalize font-semibold">{details.plan}</span>
                                  </div>
                                )}
                                {details.email && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Email: </span>
                                    <span className="text-foreground">{details.email}</span>
                                  </div>
                                )}
                                {details.product && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Produto: </span>
                                    <span className="text-foreground">{details.product}</span>
                                  </div>
                                )}
                                {details.amount && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Valor: </span>
                                    <span className="text-primary font-bold">R$ {(details.amount / 100).toFixed(2)}</span>
                                  </div>
                                )}
                                {details.credits_added != null && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Créditos: </span>
                                    <span className="text-primary font-bold">+{details.credits_added}</span>
                                  </div>
                                )}
                                {details.status && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">Status: </span>
                                    <span className="text-foreground">{details.status}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFinancial;
