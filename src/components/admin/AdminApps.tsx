import { useState } from "react";
import { useAdminApps } from "./useAdminData";
import { Smartphone, Loader2, Copy, ExternalLink, Search, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminApps = ({ enabled }: { enabled: boolean }) => {
  const { data, isLoading } = useAdminApps(enabled);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const apps = data?.apps || [];
  const formatCounts = data?.formatCounts || {};

  const filtered = apps.filter((app: any) => {
    const matchSearch = !search || 
      app.app_name?.toLowerCase().includes(search.toLowerCase()) ||
      app.email?.toLowerCase().includes(search.toLowerCase()) ||
      app.site_url?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || app.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada!" });
  };

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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar app, email ou URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 w-full rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-1">
          {["all", "completed", "processing", "pending", "error"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Todos" : s}
            </button>
          ))}
        </div>
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
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((app: any) => (
              <tr key={app.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{app.app_name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-[180px]" title={app.site_url}>{app.site_url}</td>
                <td className="px-4 py-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary uppercase">{app.format}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    app.status === "completed" ? "bg-secondary/10 text-secondary" :
                    app.status === "error" ? "bg-destructive/10 text-destructive" :
                    app.status === "processing" ? "bg-primary/10 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>{app.status}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{app.email}</td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                  {new Date(app.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {app.site_url && (
                      <button onClick={() => copyUrl(app.site_url)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Copiar URL">
                        <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    )}
                    {app.download_url && (
                      <>
                        <a href={app.download_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-secondary/10 transition-colors" title="Download">
                          <Download className="w-3.5 h-3.5 text-secondary" />
                        </a>
                        <button onClick={() => copyUrl(app.download_url)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Copiar download URL">
                          <ExternalLink className="w-3.5 h-3.5 text-primary" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum app encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminApps;
