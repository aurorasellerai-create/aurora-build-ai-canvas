import { useState, useEffect } from "react";
import { useAdminMetrics, useAdminSettings, useSaveSettings } from "./useAdminData";
import { Crown, Loader2, ExternalLink, Save, Edit2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PlanConfig {
  plan: string;
  price: string;
  credits: number;
  builds: number;
  formats: string[];
}

const DEFAULT_PLANS: PlanConfig[] = [
  { plan: "free", price: "Grátis", credits: 5, builds: 1, formats: ["APK"] },
  { plan: "pro", price: "R$ 39/mês", credits: 50, builds: 5, formats: ["APK"] },
  { plan: "premium", price: "R$ 59/mês", credits: 500, builds: 999999, formats: ["APK", "AAB", "PWA"] },
];

const PLAN_LINKS: Record<string, string> = {
  pro: "https://pay.kiwify.com.br/rnou5oN",
  premium: "https://pay.kiwify.com.br/edN32V9",
};

const AdminPlans = ({ enabled }: { enabled: boolean }) => {
  const { data: metrics, isLoading } = useAdminMetrics(enabled);
  const { data: settings } = useAdminSettings(enabled);
  const saveSettings = useSaveSettings();
  const [editing, setEditing] = useState<string | null>(null);
  const [plans, setPlans] = useState<PlanConfig[]>(DEFAULT_PLANS);
  const [editForm, setEditForm] = useState<PlanConfig | null>(null);

  useEffect(() => {
    if (settings?.plan_config && Array.isArray(settings.plan_config)) {
      setPlans(settings.plan_config);
    }
  }, [settings]);

  const startEdit = (plan: PlanConfig) => {
    setEditing(plan.plan);
    setEditForm({ ...plan });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  const savePlan = () => {
    if (!editForm) return;
    const updated = plans.map((p) => (p.plan === editForm.plan ? editForm : p));
    setPlans(updated);
    saveSettings.mutate({ key: "plan_config", value: updated });
    setEditing(null);
    setEditForm(null);
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Crown className="w-5 h-5 text-primary" /> Planos e Assinaturas
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const count = plan.plan === "free" ? metrics?.freeUsers : plan.plan === "pro" ? metrics?.proUsers : metrics?.premiumUsers;
          const isEditing = editing === plan.plan;

          if (isEditing && editForm) {
            return (
              <div key={plan.plan} className="card-aurora p-5 space-y-3 border-primary/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-foreground capitalize">{plan.plan}</h3>
                  <div className="flex gap-1">
                    <button onClick={savePlan} className="p-1.5 rounded hover:bg-secondary/10 text-secondary" disabled={saveSettings.isPending}>
                      <Save className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Preço</label>
                    <input
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Créditos iniciais</label>
                    <input
                      type="number"
                      value={editForm.credits}
                      onChange={(e) => setEditForm({ ...editForm, credits: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Builds/dia</label>
                    <input
                      type="number"
                      value={editForm.builds}
                      onChange={(e) => setEditForm({ ...editForm, builds: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Formatos (separados por vírgula)</label>
                    <input
                      value={editForm.formats.join(", ")}
                      onChange={(e) => setEditForm({ ...editForm, formats: e.target.value.split(",").map((f) => f.trim()).filter(Boolean) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={plan.plan} className="card-aurora p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground capitalize">{plan.plan}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold">{plan.price}</span>
                  <button onClick={() => startEdit(plan)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{count ?? "—"} <span className="text-sm text-muted-foreground font-normal">usuários</span></p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>✓ {plan.credits} créditos</li>
                <li>✓ {plan.builds >= 999 ? "Builds ilimitados" : `${plan.builds} build(s)/dia`}</li>
                <li>✓ {plan.formats.join(", ")}</li>
              </ul>
              {PLAN_LINKS[plan.plan] && (
                <a href={PLAN_LINKS[plan.plan]} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Link checkout
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="card-aurora p-5">
        <h3 className="font-display font-bold text-foreground mb-2">Taxa de Conversão</h3>
        <p className="text-3xl font-display font-bold text-primary">{metrics?.conversionRate ?? "0"}%</p>
        <p className="text-xs text-muted-foreground mt-1">Usuários pagantes / total de usuários</p>
      </div>
    </div>
  );
};

export default AdminPlans;
