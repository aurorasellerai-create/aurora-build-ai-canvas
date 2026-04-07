import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Users, TrendingUp, Crown, Shield,
  Loader2, Search,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  plan: string;
  ai_credits: number;
  bonus_builds: number;
  daily_builds_count: number;
  total_projects: number;
  completed_projects: number;
  created_at: string;
}

interface Metrics {
  totalUsers: number;
  proUsers: number;
  premiumUsers: number;
  freeUsers: number;
  totalProjects: number;
  completedProjects: number;
  todaySignups: number;
  conversionRate: string;
}

interface GrowthPoint {
  date: string;
  label: string;
  total: number;
  pro: number;
  premium: number;
}

const PIE_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--secondary))"];

const MetricCard = ({ label, value, icon: Icon, accent = false }: {
  label: string; value: string | number; icon: any; accent?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`card-aurora p-5 ${accent ? "border-primary/30" : ""}`}
  >
    <div className="flex items-center gap-3 mb-2">
      <Icon className={`w-5 h-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-3xl font-display font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
  </motion.div>
);

const fetchAdmin = async (action: string) => {
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?action=${action}`,
    {
      headers: {
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
};

const Admin = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin" as any,
      });
      return !!data;
    },
    enabled: !!user,
  });

  const { data: metrics } = useQuery<Metrics>({
    queryKey: ["admin-metrics"],
    queryFn: async () => (await fetchAdmin("metrics")).metrics,
    enabled: isAdmin === true,
  });

  const { data: users = [], isLoading: loadingUsers } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await fetchAdmin("list")).users,
    enabled: isAdmin === true,
  });

  const { data: growthData = [] } = useQuery<GrowthPoint[]>({
    queryKey: ["admin-growth"],
    queryFn: async () => (await fetchAdmin("growth")).growth,
    enabled: isAdmin === true,
  });

  const updatePlan = useMutation({
    mutationFn: async ({ user_id, plan }: { user_id: string; plan: string }) => {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?action=update_plan`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id, plan }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast({ title: "Plano atualizado com sucesso!" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    },
  });

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center card-aurora p-8 max-w-md">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground text-sm mb-4">Você não tem permissão para acessar este painel.</p>
          <Link to="/dashboard" className="text-primary text-sm hover:underline">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      (u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const pieData = metrics
    ? [
        { name: "Free", value: metrics.freeUsers },
        { name: "Pro", value: metrics.proUsers },
        { name: "Premium", value: metrics.premiumUsers },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg text-gradient-gold">Painel Admin</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Metrics */}
        <section>
          <h2 className="font-display font-bold text-foreground mb-4">Métricas</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total Usuários" value={metrics?.totalUsers ?? "—"} icon={Users} accent />
            <MetricCard label="Hoje" value={metrics?.todaySignups ?? "—"} icon={TrendingUp} />
            <MetricCard label="Pro" value={metrics?.proUsers ?? "—"} icon={Crown} />
            <MetricCard label="Premium" value={metrics?.premiumUsers ?? "—"} icon={Crown} accent />
            <MetricCard label="Free" value={metrics?.freeUsers ?? "—"} icon={Users} />
            <MetricCard label="Conversão" value={metrics?.conversionRate ? `${metrics.conversionRate}%` : "—"} icon={TrendingUp} accent />
            <MetricCard label="Total Apps" value={metrics?.totalProjects ?? "—"} icon={TrendingUp} />
            <MetricCard label="Apps Prontos" value={metrics?.completedProjects ?? "—"} icon={TrendingUp} />
          </div>
        </section>

        {/* Charts */}
        <section className="grid md:grid-cols-3 gap-6">
          {/* User Growth Chart */}
          <div className="md:col-span-2 card-aurora p-5">
            <h3 className="font-display font-bold text-foreground mb-4 text-sm">Cadastros — Últimos 30 dias</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Cadastros"
                    stroke="hsl(var(--primary))"
                    fill="url(#gradTotal)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Plan Distribution Pie */}
          <div className="card-aurora p-5">
            <h3 className="font-display font-bold text-foreground mb-4 text-sm">Distribuição de Planos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* Users */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-foreground">Usuários</h2>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuário</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Plano</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Apps</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">IA</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Desde</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">
                        {u.display_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 text-center">
                        <Select
                          value={u.plan}
                          onValueChange={(val) => updatePlan.mutate({ user_id: u.user_id, plan: val })}
                        >
                          <SelectTrigger className="w-28 mx-auto h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">
                        {u.completed_projects}/{u.total_projects}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{u.ai_credits}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum usuário encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Admin;
