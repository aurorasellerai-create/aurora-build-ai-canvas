import { useAdminAiUsage } from "./useAdminData";
import { Bot, Loader2 } from "lucide-react";

const TOOL_LABELS: Record<string, string> = {
  ai_tool_names: "Gerador de Nomes",
  ai_tool_ideas: "Gerador de Ideias",
  ai_tool_description: "Descrição IA",
  ai_tool_icon: "Gerador de Ícone",
  ai_tool_splash: "Gerador de Splash",
  generate_business: "Gerador de Negócio",
};

const AdminAiUsage = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminAiUsage(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const toolCounts = data?.toolCounts || {};
  const totalRequests = data?.totalAiRequests || 0;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" /> Uso da IA
      </h2>

      <div className="card-aurora p-5">
        <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Total de requisições IA</p>
        <p className="text-3xl font-display font-bold text-primary">{totalRequests}</p>
      </div>

      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-3 text-sm">Ferramentas mais usadas</h3>
        <div className="space-y-3">
          {Object.entries(toolCounts as Record<string, number>)
            .sort(([, a], [, b]) => b - a)
            .map(([tool, count]) => {
              const maxCount = Math.max(...Object.values(toolCounts as Record<string, number>));
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={tool}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">{TOOL_LABELS[tool] || tool}</span>
                    <span className="text-sm font-bold text-foreground">{count}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default AdminAiUsage;
