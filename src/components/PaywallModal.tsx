import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Crown, Check, Zap, Sparkles } from "lucide-react";
import type { PaywallFeature } from "@/hooks/usePaywall";

const featureTriggers: Record<PaywallFeature, string> = {
  second_app: "🔥 Recurso mais usado por quem já está faturando",
  advanced_ai: "🚀 Usuários PRO criam até 5x mais rápido",
  translation: "💰 Apps completos geram mais resultados",
  viral_system: "🚀 Comece a escalar seu negócio hoje",
  publish: "💰 Apps publicados geram receita real",
  premium_format: "🔥 Recurso mais usado por quem já está faturando",
  export_app: "🚀 Exporte e comece a faturar com seu app",
  download_apk: "📱 Baixe seu app e publique na loja",
};

const plans = [
  {
    name: "Pro",
    price: "R$29",
    period: "/mês",
    badge: "🔥 Mais escolhido",
    highlighted: true,
    features: ["5 apps por dia", "IA parcial liberada", "Sistema viral", "Suporte prioritário"],
  },
  {
    name: "Elite",
    price: "R$49",
    period: "/mês",
    badge: "💎 Máximo desempenho",
    highlighted: false,
    features: ["Apps ilimitados", "IA completa", "APK + AAB + PWA", "Tradução automática", "Suporte VIP"],
  },
];

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature: PaywallFeature;
}

const PaywallModal = ({ open, onClose, feature }: PaywallModalProps) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg bg-background border border-border rounded-2xl p-6 md:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-2">
                Desbloqueie todo o potencial da Aurora
              </h2>
              <p className="text-sm text-muted-foreground">
                Você chegou ao limite do plano gratuito. Para continuar criando apps que geram vendas, faça upgrade agora.
              </p>
            </div>

            {/* Trigger */}
            <div className="text-center mb-6">
              <p className="text-sm font-semibold text-primary">
                {featureTriggers[feature]}
              </p>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-xl p-4 border transition-all ${
                    plan.highlighted
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30"
                  }`}
                >
                  {plan.badge && (
                    <p className={`text-[10px] font-bold font-display mb-2 ${
                      plan.highlighted ? "text-primary" : "text-muted-foreground"
                    }`}>
                      {plan.badge}
                    </p>
                  )}
                  <h3 className="font-display font-bold text-foreground text-lg">{plan.name}</h3>
                  <div className="mb-3">
                    <span className={`text-2xl font-display font-bold ${plan.highlighted ? "text-primary" : "text-foreground"}`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground text-xs">{plan.period}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className={`w-3 h-3 shrink-0 ${plan.highlighted ? "text-primary" : "text-secondary"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTA */}
            <Link
              to="/pricing"
              className="block w-full py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] text-center"
            >
              Desbloquear agora
            </Link>

            <Link
              to="/pricing"
              className="block w-full py-2.5 text-center text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
            >
              Ver todos os planos
            </Link>

            {/* Urgency */}
            <div className="text-center mt-3 space-y-1">
              <p className="text-xs text-secondary">⏳ Liberação imediata após upgrade</p>
              <p className="text-xs text-muted-foreground animate-pulse">⚠️ Oferta pode sair do ar a qualquer momento</p>
            </div>

            {/* Bonus */}
            <p className="text-[10px] text-muted-foreground text-center mt-3">
              🎁 Ganhe bônus ao desbloquear agora — créditos de IA + recursos extras
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallModal;
