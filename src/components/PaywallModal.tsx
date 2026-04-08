import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Zap, Shield, Lock, Rocket, CheckCircle2 } from "lucide-react";
import type { PaywallFeature } from "@/hooks/usePaywall";
import { toast } from "sonner";

const featureMessages: Record<PaywallFeature, { title: string; subtitle: string }> = {
  second_app: {
    title: "Você atingiu o limite do seu plano",
    subtitle: "Seu plano permite apenas 1 app. Desbloqueie apps ilimitados agora.",
  },
  advanced_ai: {
    title: "IA Avançada bloqueada",
    subtitle: "Desbloqueie a IA completa para criar apps profissionais em minutos.",
  },
  translation: {
    title: "Tradução Automática bloqueada",
    subtitle: "Traduza seu app para qualquer idioma com um clique.",
  },
  viral_system: {
    title: "Sistema Viral bloqueado",
    subtitle: "Ative o sistema viral para escalar seu negócio automaticamente.",
  },
  publish: {
    title: "Publicação bloqueada",
    subtitle: "Publique seu app nas lojas e comece a faturar.",
  },
  premium_format: {
    title: "Formato não disponível no seu plano",
    subtitle: "AAB e PWA estão disponíveis apenas no plano Premium.",
  },
  export_app: {
    title: "Exportação bloqueada",
    subtitle: "Exporte seu app e publique em qualquer plataforma.",
  },
  download_apk: {
    title: "Download bloqueado",
    subtitle: "Baixe o APK do seu app para testar no celular.",
  },
};

const premiumBenefits = [
  "Builds ilimitados (sem bloqueios)",
  "APK + AAB + PWA liberados",
  "IA sem limites",
  "Prioridade máxima",
  "Maior velocidade",
  "Acesso total às ferramentas",
  "500 créditos inclusos",
  "Suporte VIP",
];

const PREMIUM_LINK = "https://pay.kiwify.com.br/edN32V9";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature: PaywallFeature;
}

const PaywallModal = ({ open, onClose, feature }: PaywallModalProps) => {
  const handleUpgrade = () => {
    toast.success("Redirecionando para pagamento...", { duration: 2000 });
    setTimeout(() => {
      window.open(PREMIUM_LINK, "_blank", "noopener,noreferrer");
    }, 600);
  };

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
            className="relative w-full max-w-md bg-background border border-border rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-destructive" />
              </div>
              <h2 className="text-lg md:text-xl font-display font-bold text-foreground">
                {featureMessages[feature].title}
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                {featureMessages[feature].subtitle}
              </p>
            </div>

            {/* Comparison */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              {/* Current plan */}
              <div className="p-3 rounded-xl border border-border bg-muted/30 text-center">
                <p className="text-xs font-bold text-muted-foreground mb-2">Seu plano atual</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-destructive flex items-center gap-1 justify-center">
                    <X className="w-3 h-3" /> Limitado
                  </p>
                  <p className="text-xs text-destructive flex items-center gap-1 justify-center">
                    <X className="w-3 h-3" /> Restrições ativas
                  </p>
                  <p className="text-xs text-destructive flex items-center gap-1 justify-center">
                    <X className="w-3 h-3" /> Sem prioridade
                  </p>
                </div>
              </div>

              {/* Premium */}
              <div className="p-3 rounded-xl border-2 border-primary bg-primary/5 text-center relative">
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full whitespace-nowrap">
                  ⭐ Recomendado
                </div>
                <p className="text-xs font-bold text-primary mb-2">Premium</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-secondary flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3 h-3" /> Sem limites
                  </p>
                  <p className="text-xs text-secondary flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3 h-3" /> Acesso completo
                  </p>
                  <p className="text-xs text-secondary flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3 h-3" /> Maior velocidade
                  </p>
                </div>
              </div>
            </div>

            {/* Benefits list */}
            <div className="mb-5 p-3 rounded-xl bg-muted/20 border border-border">
              <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-primary" /> Tudo incluído no Premium:
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {premiumBenefits.map((benefit) => (
                  <p key={benefit} className="text-xs text-muted-foreground flex items-start gap-1">
                    <Zap className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                    {benefit}
                  </p>
                ))}
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={handleUpgrade}
              className="w-full py-3.5 bg-primary text-primary-foreground font-display font-bold text-sm rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Desbloquear tudo agora — R$59/mês
            </button>

            {/* Secondary CTA */}
            <button
              onClick={onClose}
              className="w-full mt-2 py-2.5 text-muted-foreground text-xs font-medium hover:text-foreground transition-colors"
            >
              Continuar com limitações
            </button>

            {/* Micro copy */}
            <div className="mt-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1">
                <Shield className="w-3 h-3 text-secondary" />
                <span className="text-[10px] text-muted-foreground">
                  Leva menos de 1 minuto · Acesso imediato · Sem burocracia
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                🔥 +1.247 pessoas já desbloquearam esta semana
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallModal;
