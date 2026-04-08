import { useAdminCredits } from "./useAdminData";
import { Zap, Loader2 } from "lucide-react";

const ACTION_LABELS: Record<string, string> = {
  generate_app: "Gerar App",
  generate_business: "Gerar Negócio",
  ai_tool_names: "Nomes IA",
  ai_tool_ideas: "Ideias IA",
  ai_tool_description: "Descrição IA",
  ai_tool_icon: "Ícone IA",
  ai_tool_splash: "Splash IA",
};

const AdminCredits = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminCredits(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const actionTotals = data?.actionTotals || {};
  const topConsumers = data?.topConsumers || [];
  const totalUsed = Object.values(actionTotals as Record<string, number>).reduce((a: number, b: number) => a + b, 0);

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" /> Créditos
      </h2>

      <div className="card-aurora p-5">
        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total consumido</p>
        <p className="text-3xl font-display font-bold text-primary">{totalUsed}</p>
      </div>

      {/* By action */}
      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Por ação</h3>
        <div className="space-y-2">
          {Object.entries(actionTotals as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .map(([action, total]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{ACTION_LABELS[action] || action}</span>
                <span className="text-sm font-bold text-foreground">{total}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Top consumers */}
      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Maiores consumidores</h3>
        <div className="space-y-2">
          {topConsumers.map((c: any, i: number) => (
            <div key={c.user_id} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">#{i + 1}</span> {c.email}
              </span>
              <span className="text-sm font-bold text-primary">{c.total_used}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCredits;
