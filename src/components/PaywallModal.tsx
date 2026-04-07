import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { X, Crown, Check, Zap, Shield } from "lucide-react";
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

const comparison = [
  { feature: "Apps por dia", free: "1", pro: "5", premium: "Ilimitado" },
  { feature: "Créditos de IA", free: "5", pro: "50", premium: "500" },
  { feature: "Exportação", free: "—", pro: "APK", premium: "APK + AAB + PWA" },
  { feature: "Velocidade de IA", free: "Básica", pro: "3x mais rápida", premium: "Máxima" },
  { feature: "Tradução automática", free: "—", pro: "—", premium: "✓" },
  { feature: "Suporte", free: "Básico", pro: "Prioritário", premium: "VIP" },
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl bg-background border border-border rounded-2xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                Seu app está quase pronto 🚀
              </h2>
              <p className="text-sm text-muted-foreground">
                Para finalizar e publicar, ative o modo PRO.
              </p>
              <p className="text-sm font-semibold text-primary mt-2">
                {featureTriggers[feature]}
              </p>
            </div>

            {/* Comparison Table */}
            <div className="mb-6 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground font-medium">Recurso</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Free</th>
                    <th className="text-center py-2 px-2 text-primary font-bold">Pro ⭐</th>
                    <th className="text-center py-2 px-2 text-muted-foreground font-medium">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.feature} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground">{row.feature}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{row.free}</td>
                      <td className="py-2 px-2 text-center text-primary font-semibold">{row.pro}</td>
                      <td className="py-2 px-2 text-center text-muted-foreground">{row.premium}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cost per credit hint */}
            <div className="mb-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> Gerar app = 1 crédito</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> Criar copy = 1 crédito</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-primary" /> Tradução = 2 créditos</span>
            </div>

            {/* CTAs */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Link
                to="/pricing"
                className="py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] text-center"
              >
                Ativar PRO agora
              </Link>
              <Link
                to="/credits"
                className="py-3.5 border border-primary text-primary font-display font-bold text-sm rounded-lg hover:bg-primary/10 transition-all hover:scale-[1.02] text-center flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Comprar créditos
              </Link>
            </div>

            {/* Urgency + Social Proof */}
            <div className="text-center space-y-1.5">
              <p className="text-xs text-secondary font-medium">⏳ Liberação imediata após upgrade</p>
              <p className="text-xs text-muted-foreground animate-pulse">⚠️ Oferta ativa hoje — pode sair do ar a qualquer momento</p>
              <p className="text-xs text-muted-foreground mt-2">
                🔥 +1.247 pessoas ativaram o PRO esta semana
              </p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Shield className="w-3 h-3 text-secondary" />
                <span className="text-[10px] text-muted-foreground">Pagamento seguro · Liberação instantânea · Sem compromisso</span>
              </div>
            </div>

            {/* Testimonial */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border text-center">
              <p className="text-xs text-muted-foreground italic">
                "Ativei o PRO e em 2 dias já tinha meu primeiro app gerando receita. A IA faz tudo sozinha."
              </p>
              <p className="text-xs text-foreground font-semibold mt-1">— Rafael S., empreendedor digital</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallModal;
