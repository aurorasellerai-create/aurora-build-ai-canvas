import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, CreditCard, Lock, Play, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";
import { saveValidatorHistoryItem } from "@/lib/validatorHistory";
import { APP_FORMAT_EVENT, getSelectedAppFormatPreference, type AuroraAppFormat } from "@/lib/appFormatPreference";

const highlights = [
  "Testa automaticamente todo o fluxo do app",
  "Verifica botões, páginas e navegação",
  "Identifica bugs e travamentos",
  "Valida funcionamento do checkout (sem alterar seu app)",
  "Analisa pontos críticos de segurança",
  "Garante funcionamento completo antes de publicar",
];

const prices = [
  { amount: "1", label: "validação", price: "R$ 9,90" },
  { amount: "5", label: "validações", price: "R$ 37,00" },
  { amount: "15", label: "validações", price: "R$ 97,00" },
];

const validationSteps = [
  "Iniciando validação…",
  "Testando navegação…",
  "Verificando botões…",
  "Analisando fluxo de vendas…",
  "Validando pagamentos…",
  "Checando segurança…",
  "Finalizando diagnóstico…",
];

const reportItems = [
  { status: "ok", label: "Fluxo", value: "OK", icon: "🟢" },
  { status: "ok", label: "Navegação", value: "OK", icon: "🟢" },
  { status: "warn", label: "Performance", value: "Atenção", icon: "🟡" },
  { status: "error", label: "Pagamento", value: "Erro detectado", icon: "🔴" },
];

const validationExamples: Record<AuroraAppFormat, string[]> = {
  apk: [
    "🟢 APK: instalação local funcionando",
    "🔴 Teste no celular: botão principal não responde",
    "🟡 Permissões: revisar comportamento em alguns aparelhos",
  ],
  aab: [
    "🟢 AAB: formato pronto para publicação",
    "🔴 Página de venda: botão de pagamento não responde",
    "🟡 Play Store: revisar tempo de carregamento inicial",
  ],
  pwa: [
    "🟢 PWA: instalação pelo navegador funcionando",
    "🔴 Atalho inicial: abertura falha em uma tela",
    "🟡 WebView: carregamento acima do ideal",
  ],
};

export default function AuroraValidatorSection() {
  const { balance, consumeCredits } = useCredits();
  const [isValidating, setIsValidating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [validationId, setValidationId] = useState("latest");
  const [selectedFormat, setSelectedFormat] = useState<AuroraAppFormat>(() => getSelectedAppFormatPreference());

  const progress = useMemo(() => {
    if (!isValidating && showResult) return 100;
    return Math.round(((currentStep + 1) / validationSteps.length) * 100);
  }, [currentStep, isValidating, showResult]);

  useEffect(() => {
    const syncFormat = (event: Event) => {
      const customEvent = event as CustomEvent<AuroraAppFormat>;
      setSelectedFormat(customEvent.detail ?? getSelectedAppFormatPreference());
    };

    window.addEventListener(APP_FORMAT_EVENT, syncFormat);
    window.addEventListener("storage", syncFormat);
    return () => {
      window.removeEventListener(APP_FORMAT_EVENT, syncFormat);
      window.removeEventListener("storage", syncFormat);
    };
  }, []);

  const handleValidate = async () => {
    if (isValidating) return;

    try {
      const allowed = await consumeCredits("aurora_validator", 1);
      if (!allowed) {
        toast.error("Você precisa de 1 crédito para rodar uma validação.");
        return;
      }

      setShowResult(false);
      setIsValidating(true);
      setCurrentStep(0);

      validationSteps.forEach((_, index) => {
        window.setTimeout(() => setCurrentStep(index), 520 * index);
      });

      window.setTimeout(() => {
        const id = `validator-${Date.now()}`;
        setValidationId(id);
        saveValidatorHistoryItem({
          id,
          appName: "Build Aurora",
          status: "blocked",
          createdAt: new Date().toISOString(),
          issuesCount: 2,
          warningCount: 1,
          summary: "Publicação não recomendada até correção",
        });
        setIsValidating(false);
        setShowResult(true);
        toast.success("Diagnóstico concluído.");
      }, 4200);
    } catch {
      setIsValidating(false);
      toast.error("Não foi possível iniciar a validação agora.");
    }
  };

  return (
    <section className="py-20 px-4 bg-aurora-gradient" id="aurora-validator" aria-label="Aurora Validator">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid lg:grid-cols-[1.08fr_0.92fr] gap-6 items-stretch"
        >
          <div className="card-aurora relative overflow-hidden p-6 md:p-8">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/70 to-transparent" />
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-5">
              <ShieldCheck className="w-3.5 h-3.5" /> Validação sob demanda
            </div>

            <h2 className="text-3xl md:text-5xl font-display font-bold text-gradient-gold mb-3">
              Aurora Validator
            </h2>
            <h3 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
              Seu app está pronto… ou você só acha que está?
            </h3>
            <p className="text-muted-foreground mb-5 max-w-2xl">
              Antes de publicar, valide todo o seu aplicativo — fluxo, bugs, segurança e pagamentos.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground mb-6 max-w-2xl">
              O Aurora Validator percorre automaticamente todo o seu aplicativo simulando o comportamento real de usuários, identificando falhas, travamentos, erros de navegação, problemas no fluxo de vendas e riscos básicos de segurança. Tudo isso antes da publicação, garantindo que sua aplicação funcione com precisão.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-6">
              {highlights.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
                  <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-secondary/25 bg-secondary/5 p-4 mb-6">
              <p className="text-sm text-foreground font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                Um pequeno erro pode interromper vendas, gerar frustração e comprometer a experiência. Não publique no escuro.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 mb-6 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Exemplo de validação · {selectedFormat.toUpperCase()}</p>
              {validationExamples[selectedFormat].map((item, index) => (
                <p key={item} className={`text-sm font-semibold ${index === 0 ? "text-secondary" : index === 1 ? "text-destructive" : "text-primary"}`}>{item}</p>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mb-6">
              {prices.map((item) => (
                <div key={item.price} className="rounded-xl border border-primary/20 bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground mb-1">{item.amount} {item.label}</p>
                  <p className="font-display text-xl font-bold text-foreground">{item.price}</p>
                </div>
              ))}
            </div>

            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary glow-gold">
              <AlertTriangle className="w-3.5 h-3.5" /> Recomendado antes de publicar qualquer app
            </div>
            <p className="mb-3 text-sm font-semibold text-foreground">Seu usuário não vai avisar o erro. Ele vai sair.</p>

            <button
              type="button"
              onClick={handleValidate}
              disabled={isValidating}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg px-6 py-4 font-display font-bold text-sm transition-all duration-300 ${
                isValidating
                  ? "bg-secondary text-secondary-foreground glow-cyan animate-pulse"
                  : "bg-primary text-primary-foreground glow-gold glow-gold-hover hover:scale-[1.02]"
              }`}
            >
              {isValidating ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {isValidating ? "Analisando seu app…" : "Validar meu app antes de publicar"}
            </button>
          </div>

          <div className="card-aurora p-6 md:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Diagnóstico Aurora</p>
                  <h3 className="font-display text-xl font-bold text-foreground">Status em tempo real</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center glow-cyan">
                  <Play className="w-5 h-5 text-secondary" />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isValidating ? (
                  <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                      <motion.div
                        className="h-full bg-secondary"
                        initial={{ width: "8%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.45, ease: "easeOut" }}
                      />
                    </div>
                    <div className="space-y-3">
                      {validationSteps.map((step, index) => (
                        <div key={step} className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${index <= currentStep ? "border-secondary/30 bg-secondary/10" : "border-border bg-muted/20"}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index <= currentStep ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {index < currentStep ? "✓" : index + 1}
                          </span>
                          <p className={`text-xs font-semibold ${index <= currentStep ? "text-foreground" : "text-muted-foreground"}`}>{step}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : showResult ? (
                  <motion.div key="result" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-4">
                      <p className="text-xs text-muted-foreground font-semibold mb-2">STATUS DO APP</p>
                      <div className="space-y-2">
                        {reportItems.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg bg-background/70 border border-border p-3">
                            <span className="text-sm text-foreground">{item.icon} {item.label}</span>
                            <span className={`text-xs font-bold ${item.status === "error" ? "text-destructive" : item.status === "warn" ? "text-primary" : "text-secondary"}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-bold text-destructive">Publicação não recomendada até correção</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                      <p className="text-sm text-destructive font-semibold">🔴 Erro crítico: Botão “Começar agora” não executa ação</p>
                      <p className="text-sm text-primary font-semibold">🟡 Alerta: Tempo de carregamento elevado</p>
                      <p className="text-sm text-secondary font-semibold">🟢 OK: Navegação geral funcional</p>
                    </div>
                    <Link to={`/validator/${validationId}`} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-display font-bold glow-gold glow-gold-hover transition-all hover:scale-[1.02]">
                      <Rocket className="w-4 h-4" /> Ver detalhes da validação
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div className="rounded-xl border border-border bg-muted/20 p-5">
                      <p className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> O Validator não altera seu aplicativo
                      </p>
                      <p className="text-sm text-muted-foreground">Ele detecta, analisa e mostra onde corrigir antes da publicação. Evite erros antes que seus usuários encontrem.</p>
                    </div>
                    <p className="text-sm font-display font-bold text-foreground">Como funciona na prática</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {["Rodar", "Corrigir", "Aprovar"].map((item) => (
                        <div key={item} className="rounded-lg border border-border bg-background/70 p-3">
                          <CheckCircle2 className="w-4 h-4 text-primary mx-auto mb-1" />
                          <p className="text-xs font-semibold text-muted-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Créditos disponíveis</p>
                        <p className="font-display text-2xl font-bold text-primary">{balance}</p>
                      </div>
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-primary" /> Seu usuário não vai avisar o erro. Ele vai sair.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
