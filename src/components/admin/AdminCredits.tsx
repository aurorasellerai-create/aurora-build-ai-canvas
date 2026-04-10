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
  ai_carousel: "Carrossel IA",
  ai_video_5s: "Vídeo 5s",
  ai_video_10s: "Vídeo 10s",
  ai_video_15s: "Vídeo 15s",
  ai_video_30s: "Vídeo 30s",
  ai_video_continue: "Continuar Vídeo",
  convert_aab: "Conversão AAB",
};

const AdminCredits = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminCredits(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const actionTotals = data?.actionTotals || {};
  const topConsumers = data?.topConsumers || [];
  const recentUsage = data?.recentUsage || [];
  const totalUsed = Object.values(actionTotals as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
  const totalBalance = data?.totalBalance || 0;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" /> Créditos
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-aurora p-5">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total consumido</p>
          <p className="text-3xl font-display font-bold text-primary">{totalUsed}</p>
        </div>
        <div className="card-aurora p-5">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Saldo total (todos)</p>
          <p className="text-3xl font-display font-bold text-foreground">{totalBalance}</p>
        </div>
      </div>

      {/* By action */}
      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Consumo por ação</h3>
        <div className="space-y-2">
          {Object.entries(actionTotals as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .map(([action, total]) => {
              const maxVal = Math.max(...Object.values(actionTotals as Record<string, number>));
              const pct = maxVal > 0 ? (total / maxVal) * 100 : 0;
              return (
                <div key={action}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{ACTION_LABELS[action] || action}</span>
                    <span className="text-sm font-bold text-foreground">{total}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
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

      {/* Recent usage */}
      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Uso recente</h3>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Ação</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Créditos</th>
                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Data</th>
              </tr>
            </thead>
            <tbody>
              {recentUsage.slice(0, 30).map((u: any) => (
                <tr key={u.id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-2 text-foreground">{ACTION_LABELS[u.action] || u.action}</td>
                  <td className="px-3 py-2 text-center text-primary font-bold">{u.credits_used}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleString("pt-BR")}
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

export default AdminCredits;
