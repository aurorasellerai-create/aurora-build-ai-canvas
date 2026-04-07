import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Zap, Sparkles, Rocket, Crown, Check, History, ShoppingCart, Activity } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PACKAGES = [
  {
    name: "starter",
    label: "100 Créditos IA",
    credits: 100,
    price: "R$ 29,90",
    icon: Zap,
    highlight: false,
    perCredit: "R$ 0,29",
    kiwifyLink: "https://pay.kiwify.com.br/I8aRx0x",
  },
  {
    name: "pro",
    label: "500 Créditos IA",
    credits: 500,
    price: "R$ 97,00",
    icon: Sparkles,
    highlight: true,
    badge: "Mais popular",
    perCredit: "R$ 0,19",
    kiwifyLink: "https://pay.kiwify.com.br/ZYX5C2o",
  },
  {
    name: "scale",
    label: "2000 Créditos IA",
    credits: 2000,
    price: "R$ 197,00",
    icon: Rocket,
    highlight: false,
    perCredit: "R$ 0,09",
    kiwifyLink: "https://pay.kiwify.com.br/rLikcLm",
  },
];

const Credits = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile-credits", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_balance, plan")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["credit-purchases", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_purchases")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["credit-usage", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_usage")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!user,
  });

  const balance = profile?.credits_balance ?? 0;
  const plan = profile?.plan ?? "free";

  const handleBuy = (pkg: typeof PACKAGES[0]) => {
    const email = user?.email || "";
    if (pkg.kiwifyLink) {
      window.open(`${pkg.kiwifyLink}?email=${encodeURIComponent(email)}`, "_blank");
    } else {
      // Fallback — links not configured yet
      window.open(`/pricing?package=${pkg.name}`, "_self");
    }
  };

  const barPercent = Math.min(100, balance > 0 ? (balance / (plan === "premium" ? 500 : plan === "pro" ? 50 : 5)) * 100 : 0);
  const barColor = barPercent > 50 ? "bg-primary" : barPercent > 20 ? "bg-yellow-500" : "bg-destructive";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-lg text-gradient-gold">Créditos de IA</h1>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-aurora p-6 text-center"
        >
          <p className="text-sm text-muted-foreground mb-1">Seu saldo atual</p>
          <p className="text-5xl font-display font-bold text-primary mb-3">{balance}</p>
          <p className="text-xs text-muted-foreground mb-4">créditos disponíveis</p>
          <div className="w-full max-w-xs mx-auto h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${barPercent}%` }}
            />
          </div>
          {balance <= 2 && (
            <p className="text-xs text-destructive mt-3 font-medium animate-pulse">
              ⚠️ Créditos acabando — compre mais para continuar usando a IA
            </p>
          )}
        </motion.div>

        {/* Packages */}
        <div>
          <h2 className="font-display font-bold text-foreground text-center mb-2">
            Comprar créditos
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Cada ação de IA consome créditos. Escolha o pacote ideal para seu ritmo.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg, i) => (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`card-aurora p-6 relative flex flex-col ${
                  pkg.highlight ? "border-primary/50 ring-1 ring-primary/20" : ""
                }`}
              >
                {pkg.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {pkg.badge}
                  </span>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <pkg.icon className={`w-6 h-6 ${pkg.highlight ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="font-display font-bold text-lg text-foreground">{pkg.label}</h3>
                </div>

                <p className="text-4xl font-display font-bold text-foreground mb-1">{pkg.credits}</p>
                <p className="text-xs text-muted-foreground mb-4">créditos de IA</p>

                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" /> Gerar apps com IA
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" /> Criar copys e textos
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" /> Tradução automática
                  </li>
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary" /> Sem expiração
                  </li>
                </ul>

                <div className="mt-auto">
                  <p className="text-2xl font-bold text-foreground mb-1">{pkg.price}</p>
                  <p className="text-xs text-muted-foreground mb-4">{pkg.perCredit}/crédito</p>

                  <button
                    onClick={() => handleBuy(pkg)}
                    className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${
                      pkg.highlight
                        ? "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25"
                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                    }`}
                  >
                    Comprar créditos
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* History */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-display font-bold text-foreground text-center mb-6 flex items-center justify-center gap-2">
            <History className="w-5 h-5 text-primary" /> Histórico
          </h2>

          <Tabs defaultValue="usage" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="usage" className="flex items-center gap-1.5">
                <Activity className="w-4 h-4" /> Uso de créditos
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4" /> Compras
              </TabsTrigger>
            </TabsList>

            <TabsContent value="usage" className="card-aurora p-4">
              {usage.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhum uso registrado ainda.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {usage.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground capitalize">{item.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-destructive">-{item.credits_used}</span>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="purchases" className="card-aurora p-4">
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma compra realizada ainda.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {purchases.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.package_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          <span className={item.status === "approved" ? "text-secondary" : "text-muted-foreground"}>
                            {item.status === "approved" ? "Aprovado" : item.status === "pending" ? "Pendente" : item.status}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-primary">+{item.credits_amount}</span>
                        <p className="text-xs text-muted-foreground">R$ {(item.amount / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Monetization CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            💰 Você já criou seu app. Agora ative a monetização automática.
          </p>
          <a
            href="https://auroraseller.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2 bg-primary text-primary-foreground font-display text-xs font-bold rounded-lg glow-gold transition-all hover:scale-105 shrink-0"
          >
            Monetizar agora
          </a>
        </motion.div>

        {/* Social proof */}
        <div className="text-center space-y-2 pb-8">
          <p className="text-xs text-muted-foreground">
            🔥 Mais de 1.247 pessoas compraram créditos esta semana
          </p>
          <p className="text-xs text-muted-foreground">
            ⚡ Créditos são liberados instantaneamente após o pagamento
          </p>
        </div>
      </div>
    </div>
  );
};

export default Credits;
