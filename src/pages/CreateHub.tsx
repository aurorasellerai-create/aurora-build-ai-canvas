import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, Smartphone, RefreshCw, Sparkles, ArrowRight, Zap, AlertTriangle, Info } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

type FlowType = null | "create" | "convert-site" | "convert-file";

const FLOWS = [
  {
    id: "create" as const,
    icon: Sparkles,
    title: "Criar App do Zero",
    desc: "Crie seu aplicativo a partir de um projeto Lovable ou outra plataforma",
    color: "text-primary",
  },
  {
    id: "convert-site" as const,
    icon: Globe,
    title: "Converter Site em App",
    desc: "Transforme qualquer site em aplicativo instalável",
    color: "text-secondary",
  },
  {
    id: "convert-file" as const,
    icon: RefreshCw,
    title: "Converter Arquivo (APK / AAB)",
    desc: "Converta entre formatos APK, AAB e PWA",
    color: "text-accent-foreground",
  },
];

export default function CreateHub() {
  const [selectedFlow, setSelectedFlow] = useState<FlowType>(null);
  const { balance } = useCredits();

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
                  to={
                    flow.id === "create" ? "/generator/create"
                    : flow.id === "convert-site" ? "/generator/site"
                    : "/generator/convert"
                  }
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
        </motion.div>

        {/* Format Guide */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 p-5 rounded-xl border border-border bg-muted/20"
        >
          <h3 className="font-display font-bold text-sm text-foreground mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Entenda os formatos
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { label: "APK", icon: Smartphone, desc: "Instalar diretamente no celular", note: "Apenas para testes", noteColor: "text-destructive" },
              { label: "AAB", icon: Smartphone, desc: "Publicar na Google Play Store", note: "Formato oficial do Google", noteColor: "text-primary" },
              { label: "PWA", icon: Globe, desc: "App web instalável pelo navegador", note: "Android e iPhone", noteColor: "text-muted-foreground" },
            ].map((f) => (
              <div key={f.label} className="p-3 rounded-lg bg-background border border-border">
                <p className="font-display font-bold text-foreground text-sm mb-1">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
                <p className={`text-xs mt-1 font-semibold ${f.noteColor}`}>{f.note}</p>
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
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" /> Antes de publicar
          </h3>
          <ul className="space-y-1.5">
            {[
              "A Play Store NÃO aceita APK — é necessário AAB",
              "APK serve apenas para testes internos",
              "Publicação depende de aprovação do Google/Apple",
            ].map((t, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-destructive shrink-0">•</span> {t}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
