import { motion } from "framer-motion";
import { Users, TrendingUp, Crown, DollarSign, Smartphone, Zap, Shield, CalendarDays } from "lucide-react";
import { useAdminMetrics, useAdminGrowth } from "./useAdminData";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Loader2 } from "lucide-react";

const PIE_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--secondary))"];

const MetricCard = ({ label, value, icon: Icon, accent = false, sub }: {
  label: string; value: string | number; icon: any; accent?: boolean; sub?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`card-aurora p-4 relative overflow-hidden ${accent ? "border-primary/30" : ""}`}
  >
    {accent && <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />}
    <div className="flex items-center gap-2 mb-1 relative">
      <Icon className={`w-4 h-4 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
    </div>
    <p className={`text-2xl font-display font-bold relative ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5 relative">{sub}</p>}
  </motion.div>
);

const AdminDashboard = ({ enabled }: { enabled: boolean }) => {
  const { data: metrics, isLoading } = useAdminMetrics(enabled);
  const { data: growthData = [] } = useAdminGrowth(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const pieData = metrics
    ? [
        { name: "Free", value: metrics.freeUsers },
        { name: "Pro", value: metrics.proUsers },
        { name: "Premium", value: metrics.premiumUsers },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Diagnostic */}
      <section>
        <h2 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Status do Sistema
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Sistema", ok: true, detail: "Operacional" },
            { label: "Webhook", ok: metrics != null, detail: metrics ? "Conectado" : "..." },
            { label: "Pagamentos", ok: metrics?.totalRevenue != null, detail: metrics?.totalRevenue != null ? `R$ ${(metrics.totalRevenue / 100).toFixed(2)}` : "—" },
            { label: "Créditos", ok: (metrics?.totalCreditsUsed ?? 0) >= 0, detail: `${metrics?.totalCreditsUsed ?? 0} consumidos` },
          ].map((item) => (
            <div key={item.label} className={`p-3 rounded-xl border transition-all ${item.ok ? "border-secondary/30 bg-secondary/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${item.ok ? "bg-secondary animate-pulse" : "bg-destructive"}`} />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className={`text-xs font-semibold ${item.ok ? "text-secondary" : "text-destructive"}`}>{item.ok ? "OK" : "Atenção"}</p>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Key Metrics */}
      <section>
        <h2 className="font-display font-bold text-foreground mb-3">Métricas Principais</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="Receita Total" value={metrics ? `R$ ${(metrics.totalRevenue / 100).toFixed(2)}` : "—"} icon={DollarSign} accent sub="Todos os tempos" />
          <MetricCard label="Receita Hoje" value={metrics ? `R$ ${(metrics.todayRevenue / 100).toFixed(2)}` : "—"} icon={DollarSign} sub="Últimas 24h" />
          <MetricCard label="Usuários" value={metrics?.totalUsers ?? "—"} icon={Users} accent sub={`${metrics?.todaySignups ?? 0} hoje`} />
          <MetricCard label="Pagantes" value={metrics ? metrics.proUsers + metrics.premiumUsers : "—"} icon={Crown} accent sub={`${metrics?.conversionRate ?? 0}% conversão`} />
          <MetricCard label="Apps" value={metrics?.totalProjects ?? "—"} icon={Smartphone} sub={`${metrics?.completedProjects ?? 0} concluídos`} />
        </div>
      </section>

      {/* Secondary Metrics */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard label="Cadastros Hoje" value={metrics?.todaySignups ?? "—"} icon={CalendarDays} />
          <MetricCard label="Free" value={metrics?.freeUsers ?? "—"} icon={Users} />
          <MetricCard label="Pro" value={metrics?.proUsers ?? "—"} icon={Crown} />
          <MetricCard label="Premium" value={metrics?.premiumUsers ?? "—"} icon={Crown} accent />
          <MetricCard label="Créditos Usados" value={metrics?.totalCreditsUsed ?? "—"} icon={Zap} />
        </div>
      </section>

      {/* Charts */}
      <section className="grid md:grid-cols-3 gap-4">
        {/* Growth Chart */}
        <div className="md:col-span-2 card-aurora p-4">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Cadastros — 30 dias</h3>
          <div className="h-56">
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
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" fill="url(#gradTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="pro" name="Pro" stroke="hsl(var(--secondary))" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card-aurora p-4">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Distribuição de Planos</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Revenue Bar Chart */}
      {growthData.length > 0 && (
        <section className="card-aurora p-4">
          <h3 className="font-display font-bold text-foreground mb-3 text-sm">Cadastros por Dia (Barras)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={growthData.slice(-14)}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" name="Cadastros" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
