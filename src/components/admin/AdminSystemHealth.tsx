import { useQuery } from "@tanstack/react-query";
import { fetchAdmin } from "./useAdminData";
import { Settings, CheckCircle, AlertTriangle, XCircle, Loader2, Shield, Activity, Zap, CreditCard, Bot, Smartphone } from "lucide-react";

const severityColor: Record<string, string> = {
  info: "text-muted-foreground",
  warning: "text-yellow-500",
  error: "text-destructive",
  critical: "text-destructive font-bold",
};

const severityIcon: Record<string, typeof CheckCircle> = {
  info: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  critical: XCircle,
};

const categoryIcon: Record<string, typeof Activity> = {
  webhook: Zap,
  credits: CreditCard,
  build: Smartphone,
  ai: Bot,
  payment: CreditCard,
  system: Settings,
  performance: Activity,
  auth: Shield,
  navigation: Activity,
};

const AdminSystemHealth = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-system-health"],
    queryFn: () => fetchAdmin("system_health"),
    enabled,
    refetchInterval: 30000,
  });

  const healthStatus = data?.health || "healthy";
  const logs = data?.logs || [];
  const stats = data?.stats || {};
  const checks = data?.checks || [];

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    healthy: { label: "Sistema Saudável", color: "text-secondary", icon: "🟢" },
    unstable: { label: "Sistema Instável", color: "text-yellow-500", icon: "🟡" },
    critical: { label: "Erro Crítico", color: "text-destructive", icon: "🔴" },
  };

  const status = statusConfig[healthStatus] || statusConfig.healthy;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" /> Sistema / Diagnóstico
      </h2>

      {/* Health Status Banner */}
      <div className="card-aurora p-5 flex items-center gap-4">
        <span className="text-3xl">{status.icon}</span>
        <div>
          <p className={`font-display font-bold text-lg ${status.color}`}>{status.label}</p>
          <p className="text-xs text-muted-foreground">
            {stats.totalErrors || 0} erros · {stats.autoResolved || 0} corrigidos automaticamente · {stats.unresolvedCritical || 0} críticos pendentes
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Erros (24h)", value: stats.errorsLast24h || 0, color: "text-destructive" },
          { label: "Avisos (24h)", value: stats.warningsLast24h || 0, color: "text-yellow-500" },
          { label: "Auto-corrigidos", value: stats.autoResolved || 0, color: "text-secondary" },
          { label: "Taxa de correção", value: `${stats.resolutionRate || 0}%`, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="card-aurora p-3 text-center">
            <p className={`font-display font-bold text-xl ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* System Checks */}
      <div>
        <h3 className="font-display font-semibold text-sm text-muted-foreground mb-3">Verificações do Sistema</h3>
        <div className="space-y-2">
          {checks.map((check: any) => (
            <div key={check.label} className={`card-aurora p-3 flex items-start gap-3 ${!check.ok ? "border-destructive/30" : ""}`}>
              {check.ok ? (
                <CheckCircle className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-foreground">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Logs */}
      <div>
        <h3 className="font-display font-semibold text-sm text-muted-foreground mb-3">Logs Recentes</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground card-aurora p-4 text-center">Nenhum log registrado ainda.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log: any) => {
              const Icon = severityIcon[log.severity] || AlertTriangle;
              const CatIcon = categoryIcon[log.category] || Activity;
              return (
                <div key={log.id} className="card-aurora p-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${severityColor[log.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        <CatIcon className="w-3 h-3" />
                        {log.category}
                      </span>
                      {log.resolved && (
                        <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                          ✓ {log.resolution_method || "Corrigido"}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1 truncate">{log.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSystemHealth;
