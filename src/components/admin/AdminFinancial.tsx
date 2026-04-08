import { useAdminFinancial } from "./useAdminData";
import { DollarSign, Loader2 } from "lucide-react";

const AdminFinancial = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminFinancial(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const fmt = (v: number) => `R$ ${(v / 100).toFixed(2)}`;

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

      {/* Payments table */}
      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Últimos pagamentos</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground text-xs">Plano</th>
                <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Valor</th>
                <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Status</th>
                <th className="text-center px-3 py-2 font-semibold text-muted-foreground text-xs">Data</th>
              </tr>
            </thead>
            <tbody>
              {(data?.payments || []).slice(0, 20).map((p: any) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 text-foreground capitalize">{p.plan}</td>
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
    </div>
  );
};

export default AdminFinancial;
