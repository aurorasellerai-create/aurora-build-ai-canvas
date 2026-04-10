import { useState } from "react";
import { useAdminFinancial } from "./useAdminData";
import { DollarSign, Loader2, Search } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const AdminFinancial = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminFinancial(enabled);
  const [tab, setTab] = useState<"payments" | "credits">("payments");

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
        <button
          onClick={() => setTab("payments")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "payments" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Pagamentos ({(data?.payments || []).length})
        </button>
        <button
          onClick={() => setTab("credits")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === "credits" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Compras de créditos ({(data?.creditPurchases || []).length})
        </button>
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
    </div>
  );
};

export default AdminFinancial;
