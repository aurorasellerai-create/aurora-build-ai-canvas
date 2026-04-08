import { useAdminApps } from "./useAdminData";
import { Smartphone, Loader2 } from "lucide-react";

const AdminApps = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminApps(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const apps = data?.apps || [];
  const formatCounts = data?.formatCounts || {};

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Smartphone className="w-5 h-5 text-primary" /> Apps Gerados ({apps.length})
      </h2>

      {/* Format distribution */}
      <div className="grid grid-cols-3 gap-3">
        {(["apk", "aab", "pwa"] as const).map((f) => (
          <div key={f} className="card-aurora p-4 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{formatCounts[f] || 0}</p>
            <p className="text-xs text-muted-foreground uppercase font-semibold">{f}</p>
          </div>
        ))}
      </div>

      {/* App list */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">App</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">URL</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Formato</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuário</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Data</th>
            </tr>
          </thead>
          <tbody>
            {apps.slice(0, 50).map((app: any) => (
              <tr key={app.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{app.app_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[200px]">{app.site_url}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase">{app.format}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    app.status === "completed" ? "bg-secondary/10 text-secondary" :
                    app.status === "error" ? "bg-destructive/10 text-destructive" :
                    "bg-muted text-muted-foreground"
                  }`}>{app.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{app.email}</td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                  {new Date(app.created_at).toLocaleDateString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminApps;
