import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Check, Crown, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const plans = [
  {
    name: "Free",
    key: "free" as const,
    price: "Grátis",
    period: "",
    features: ["1 build por dia", "Apenas APK", "Acesso limitado"],
    highlighted: false,
  },
  {
    name: "Pro",
    key: "pro" as const,
    price: "R$29",
    period: "/mês",
    features: ["5 builds por dia", "APK liberado", "Gerador de nomes ilimitado", "Gerador de ideias limitado"],
    highlighted: false,
  },
  {
    name: "Premium",
    key: "premium" as const,
    price: "R$49",
    period: "/mês",
    badge: "Mais escolhido",
    features: [
      "Builds ilimitados",
      "APK + AAB + PWA",
      "Gerador de nomes ilimitado",
      "Gerador de ideias ilimitado",
      "Prioridade na fila",
      "Maior velocidade",
    ],
    highlighted: true,
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const currentPlan = profile?.plan || "free";

  const handleUpgrade = async (planKey: "free" | "pro" | "premium") => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (planKey === currentPlan) return;

    // Simulated checkout
    toast({ title: "Processando pagamento...", description: "Simulação de checkout" });
    await new Promise((r) => setTimeout(r, 1500));

    const { error } = await supabase
      .from("profiles")
      .update({ plan: planKey })
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: `Plano atualizado para ${planKey.toUpperCase()}!`, description: "Aproveite seus novos recursos." });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to={user ? "/dashboard" : "/"} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Planos</h1>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-3xl md:text-5xl font-display font-bold text-center text-gradient-gold mb-4"
        >
          Escolha seu plano
        </motion.h2>
        <p className="text-muted-foreground text-center mb-16 max-w-md mx-auto">
          Upgrade para desbloquear todos os recursos e criar apps sem limites
        </p>

        <div className="grid md:grid-cols-3 gap-6 items-end">
          {plans.map((plan, i) => {
            const isCurrent = user && plan.key === currentPlan;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`card-aurora relative transition-all duration-500 ${
                  plan.highlighted ? "scale-105 border-primary glow-gold lg:py-10" : "hover:border-secondary"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground font-display text-xs font-bold rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {plan.badge}
                  </div>
                )}
                <h3 className={`font-display text-2xl font-bold mb-2 ${plan.highlighted ? "text-gradient-gold" : "text-foreground"}`}>
                  {plan.name}
                </h3>
                <div className="mb-6">
                  <span className={`text-4xl font-display font-bold ${plan.highlighted ? "text-primary" : "text-foreground"}`}>
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className={`w-4 h-4 ${plan.highlighted ? "text-primary" : "text-secondary"}`} /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={!!isCurrent}
                  className={`w-full py-3 rounded-lg font-display font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.highlighted
                      ? "bg-primary text-primary-foreground glow-gold glow-gold-hover hover:scale-105"
                      : "border border-secondary text-secondary hover:bg-secondary/10 hover:scale-105"
                  }`}
                >
                  {isCurrent ? "Plano atual" : plan.price === "Grátis" ? "Começar grátis" : "Assinar agora"}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
