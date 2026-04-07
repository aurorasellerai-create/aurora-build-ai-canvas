import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Globe, Smartphone, RefreshCw, Sparkles, ArrowRight, Zap, AlertTriangle, Info, HelpCircle, Lightbulb, Store, CheckCircle2, X } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

const FLOWS = [
  {
    id: "create" as const,
    icon: Sparkles,
    title: "Criar App do Zero",
    desc: "Crie seu aplicativo a partir de um projeto Lovable ou outra plataforma",
    color: "text-primary",
    link: "/generator/create",
  },
  {
    id: "convert-site" as const,
    icon: Globe,
    title: "Converter Site em App",
    desc: "Transforme qualquer site em aplicativo instalável",
    color: "text-secondary",
    link: "/generator/site",
  },
  {
    id: "convert-file" as const,
    icon: RefreshCw,
    title: "Converter Arquivo (APK / AAB)",
    desc: "Converta entre formatos APK, AAB e PWA",
    color: "text-accent-foreground",
    link: "/generator/convert",
  },
];

export default function CreateHub() {
  const { balance } = useCredits();
  const [showHelper, setShowHelper] = useState(false);
  const [helperGoal, setHelperGoal] = useState<null | "publish" | "test" | "share">(null);

  const helperResult = helperGoal === "publish"
    ? { format: "AAB", reason: "A Google Play Store exige o formato AAB. Use este formato para publicação.", link: "/generator/create", label: "Criar App em AAB" }
    : helperGoal === "test"
    ? { format: "APK", reason: "APK permite instalar diretamente no celular para testes rápidos.", link: "/generator/create", label: "Criar App em APK" }
    : helperGoal === "share"
    ? { format: "PWA", reason: "PWA funciona como app instalável pelo navegador, sem necessidade de loja.", link: "/generator/create", label: "Criar App em PWA" }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">Criar Aplicativo</h1>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span>{balance} créditos</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {["Escolher tipo", "Inserir dados", "Gerar app", "Exportar"].map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {step}
              </span>
              {i < 3 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Flow selection */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="font-display text-2xl font-bold text-foreground text-center mb-2">
            O que você quer fazer?
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Escolha o caminho ideal para o seu objetivo
          </p>

          <div className="space-y-4">
            {FLOWS.map((flow, i) => (
              <motion.div
                key={flow.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link
                  to={flow.link}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <flow.icon className={`w-6 h-6 ${flow.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-bold text-foreground">{flow.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{flow.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Smart helper button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => { setShowHelper(true); setHelperGoal(null); }}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
            >
              <HelpCircle className="w-4 h-4" /> Não sabe qual escolher? O Aurora decide pra você
            </button>
          </motion.div>
        </motion.div>

        {/* Smart Helper Modal */}
        <AnimatePresence>
          {showHelper && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="mt-6 p-5 rounded-xl border border-primary/30 bg-primary/5 relative"
            >
              <button onClick={() => setShowHelper(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-primary" /> Qual é seu objetivo?
              </h3>

              {!helperGoal ? (
                <div className="space-y-2">
                  {[
                    { id: "publish" as const, label: "Publicar na Play Store", desc: "Quero meu app disponível para download na Google Play" },
                    { id: "test" as const, label: "Testar no meu celular", desc: "Quero instalar e testar no meu dispositivo Android" },
                    { id: "share" as const, label: "Compartilhar por link", desc: "Quero enviar um link para as pessoas usarem como app" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setHelperGoal(opt.id)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/40 bg-background transition-all"
                    >
                      <p className="text-sm font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              ) : helperResult && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="p-4 rounded-lg bg-background border border-border">
                    <p className="text-sm font-bold text-primary mb-1">✅ Formato recomendado: {helperResult.format}</p>
                    <p className="text-xs text-muted-foreground">{helperResult.reason}</p>
                  </div>
                  <Link
                    to={helperResult.link}
                    className="w-full py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
                  >
                    <ArrowRight className="w-4 h-4" /> {helperResult.label}
                  </Link>
                  <button onClick={() => setHelperGoal(null)} className="text-xs text-muted-foreground hover:text-foreground w-full text-center">
                    ← Escolher outro objetivo
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Format Guide - Enhanced */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="mt-10 p-5 rounded-xl border border-border bg-muted/20"
        >
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> O que você precisa saber
          </h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {[
              { label: "📌 APK", desc: "Instalar diretamente no celular", note: "Apenas para testes", noteColor: "text-destructive" },
              { label: "📌 AAB", desc: "Obrigatório para Google Play", note: "Formato oficial", noteColor: "text-primary" },
              { label: "📌 PWA", desc: "App web pelo navegador", note: "Android e iPhone", noteColor: "text-muted-foreground" },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-lg bg-background border border-border">
                <p className="font-display font-bold text-foreground text-sm mb-1">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
                <p className={`text-xs mt-1 font-semibold ${f.noteColor}`}>{f.note}</p>
              </div>
            ))}
          </div>

          {/* Quick tip */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
            <p className="text-xs text-foreground font-semibold flex items-center gap-1.5 mb-1">
              <Lightbulb className="w-3.5 h-3.5 text-primary" /> Dica rápida
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Quer publicar?</strong> → Sempre use <span className="text-primary font-bold">AAB</span>
              <span className="text-border mx-2">|</span>
              <strong>Quer testar?</strong> → Use <span className="font-bold text-foreground">APK</span>
            </p>
          </div>

          {/* Conversions */}
          <div className="grid sm:grid-cols-2 gap-2">
            {[
              { from: "APK", to: "AAB", desc: "Necessário para enviar app para a loja" },
              { from: "AAB", to: "APK", desc: "Usado para testes no dispositivo" },
            ].map((c) => (
              <div key={`${c.from}-${c.to}`} className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border">
                <RefreshCw className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">{c.from} → {c.to}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Warning block */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5"
        >
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Importante: Antes de publicar
          </h3>
          <ul className="space-y-2">
            {[
              { text: "A Play Store NÃO aceita APK", bold: true },
              { text: "Se você tentar enviar APK, seu app será recusado", bold: false },
              { text: "É necessário AAB para publicação", bold: true },
              { text: "APK serve apenas para testes internos", bold: false },
              { text: "Publicação depende de aprovação do Google/Apple", bold: false },
            ].map((t, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-destructive shrink-0 mt-0.5">⚠️</span>
                <span className={t.bold ? "font-bold text-foreground" : ""}>{t.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Advanced tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-6 p-4 rounded-xl border border-border bg-muted/20"
        >
          <h3 className="font-display font-bold text-xs text-foreground flex items-center gap-2 mb-2">
            🔧 Alternativa avançada
          </h3>
          <p className="text-xs text-muted-foreground">
            Você pode gerar AAB usando ferramentas como <strong>Android Studio</strong> (Build → Generate Signed Bundle).
            Mas aqui no Aurora Build AI você faz tudo automático, sem precisar configurar nada.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
