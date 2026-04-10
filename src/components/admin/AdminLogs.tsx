import { useState } from "react";
import { useAdminLogs } from "./useAdminData";
import { FileText, Loader2, Search, AlertTriangle, CheckCircle, XCircle, Activity, Filter } from "lucide-react";

const severityConfig: Record<string, { color: string; icon: typeof CheckCircle; bg: string }> = {
  info: { color: "text-muted-foreground", icon: CheckCircle, bg: "bg-muted/30" },
  warning: { color: "text-yellow-500", icon: AlertTriangle, bg: "bg-yellow-500/5" },
  error: { color: "text-destructive", icon: XCircle, bg: "bg-destructive/5" },
  critical: { color: "text-destructive", icon: XCircle, bg: "bg-destructive/10" },
};

const AdminLogs = ({ enabled }: { enabled: boolean }) => {
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useAdminLogs(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const logs = data?.logs || [];
  const stats = data?.stats || {};

  const categories = [...new Set(logs.map((l: any) => l.category))];

  const filtered = logs.filter((log: any) => {
    const matchSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchCategory = categoryFilter === "all" || log.category === categoryFilter;
    const matchSearch = !search || log.message?.toLowerCase().includes(search.toLowerCase());
    return matchSeverity && matchCategory && matchSearch;
  });

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" /> Logs do Sistema
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Erros (24h)", value: stats.errorsLast24h || 0, color: "text-destructive" },
          { label: "Avisos (24h)", value: stats.warningsLast24h || 0, color: "text-yellow-500" },
          { label: "Corrigidos", value: stats.autoResolved || 0, color: "text-secondary" },
          { label: "Críticos pendentes", value: stats.unresolvedCritical || 0, color: "text-destructive" },
        ].map((s) => (
          <div key={s.label} className="card-aurora p-3 text-center">
            <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nos logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1 items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {["all", "info", "warning", "error", "critical"].map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                severityFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
        {categories.length > 1 && (
          <div className="flex gap-1 items-center flex-wrap">
            {["all", ...categories].map((c: string) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  categoryFilter === c ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "all" ? "Todas" : c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="card-aurora p-8 text-center">
          <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.map((log: any) => {
            const config = severityConfig[log.severity] || severityConfig.info;
            const Icon = config.icon;
            return (
              <div key={log.id} className={`card-aurora p-3 flex items-start gap-3 ${config.bg}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {log.category}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${config.color} ${config.bg}`}>
                      {log.severity}
                    </span>
                    {log.email && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {log.email}
                      </span>
                    )}
                    {log.resolved && (
                      <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                        ✓ {log.resolution_method || "Corrigido"}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-1">{log.message}</p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
