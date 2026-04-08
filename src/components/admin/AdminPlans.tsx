import { useAdminMetrics } from "./useAdminData";
import { Crown, Loader2, ExternalLink } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: "Grátis",
    features: ["1 build/dia", "Apenas APK", "5 créditos"],
  },
  {
    name: "Pro",
    price: "R$ 39/mês",
    features: ["5 builds/dia", "APK", "50 créditos", "IA básica"],
    link: "https://pay.kiwify.com.br/rnou5oN",
  },
  {
    name: "Premium",
    price: "R$ 59/mês",
    features: ["Builds ilimitados", "APK + AAB + PWA", "500 créditos", "IA sem limites", "Prioridade"],
    link: "https://pay.kiwify.com.br/edN32V9",
  },
];

const AdminPlans = ({ enabled }: { enabled: boolean }) => {
  const { data: metrics, isLoading } = useAdminMetrics(enabled);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Crown className="w-5 h-5 text-primary" /> Planos e Assinaturas
      </h2>

      <div className="grid md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const count = plan.name === "Free" ? metrics?.freeUsers : plan.name === "Pro" ? metrics?.proUsers : metrics?.premiumUsers;
          return (
            <div key={plan.name} className="card-aurora p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground">{plan.name}</h3>
                <span className="text-primary font-bold">{plan.price}</span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{count ?? "—"} <span className="text-sm text-muted-foreground font-normal">usuários</span></p>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-muted-foreground">✓ {f}</li>
                ))}
              </ul>
              {plan.link && (
                <a href={plan.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
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
