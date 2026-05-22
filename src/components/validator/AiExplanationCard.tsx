import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  generateBatchAiExplanations,
  severityLabel,
  type AiExplanation,
  type AiExplanationInput,
} from "@/lib/generateAiExplanation";
import type { AiSeverity } from "@/lib/permissionsKnowledgeBase";

type Props = {
  items: AiExplanationInput[];
  /** Quando true, ativa typing-effect na primeira renderização. */
  typing?: boolean;
};

const SEVERITY_STYLES: Record<AiSeverity, { card: string; badge: string; glow: string; icon: typeof ShieldAlert }> = {
  critical: {
    card: "border-destructive/40 bg-destructive/5",
    badge: "bg-destructive/15 text-destructive border-destructive/40",
    glow: "shadow-[0_0_25px_-8px_hsl(var(--destructive)/0.6)]",
    icon: ShieldAlert,
  },
  warning: {
    card: "border-primary/40 bg-primary/5",
    badge: "bg-primary/15 text-primary border-primary/40",
    glow: "shadow-[0_0_25px_-8px_hsl(var(--primary)/0.55)]",
    icon: AlertTriangle,
  },
  safe: {
    card: "border-secondary/40 bg-secondary/5",
    badge: "bg-secondary/15 text-secondary border-secondary/40",
    glow: "shadow-[0_0_25px_-8px_hsl(var(--secondary)/0.5)]",
    icon: ShieldCheck,
  },
};

function TypingText({ text, enabled }: { text: string; enabled: boolean }) {
  const [shown, setShown] = useState(enabled ? "" : text);
  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 12);
    return () => window.clearInterval(id);
  }, [text, enabled]);
  return <>{shown}</>;
}

function ExplanationCard({ data, typing }: { data: AiExplanation; typing: boolean }) {
  const styles = SEVERITY_STYLES[data.severity];
  const Icon = styles.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative rounded-2xl border p-5 backdrop-blur-sm transition-all",
        styles.card,
        styles.glow,
      )}
    >
      {/* AI glow aura */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-br from-secondary/15 to-primary/10 blur-3xl opacity-60 animate-pulse" />
      </div>

      <header className="relative flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl border border-secondary/40 bg-background/70 flex items-center justify-center shrink-0 glow-cyan">
            <Sparkles className="w-4 h-4 text-secondary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-secondary/40 bg-secondary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
                <Sparkles className="w-3 h-3" /> Explicado por IA
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border bg-background/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {data.source}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  styles.badge,
                )}
              >
                <Icon className="w-3 h-3" /> {severityLabel(data.severity)}
              </span>
            </div>
            <h4 className="font-display font-bold text-foreground text-base leading-tight truncate">
              {data.title}
            </h4>
            <code className="text-[10px] font-mono text-muted-foreground">{data.key}</code>
          </div>
        </div>
      </header>

      <p className="relative text-sm text-foreground/90 leading-relaxed mb-3">
        <TypingText text={data.explanation} enabled={typing} />
      </p>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="relative grid gap-3 mb-3"
        >
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
              Impacto técnico
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">{data.impact}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
              Risco Play Store
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">{data.playStoreRisk}</p>
          </div>
          <div className="rounded-lg border border-border bg-background/60 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-destructive mb-1">
              Risco de segurança
            </p>
            <p className="text-xs text-foreground/85 leading-relaxed">{data.securityRisk}</p>
          </div>
          <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-secondary mb-1 flex items-center gap-1">
              <Wrench className="w-3 h-3" /> Como corrigir
            </p>
            <p className="text-xs text-foreground/90 leading-relaxed">{data.recommendation}</p>
          </div>
        </motion.div>
      )}

      <div className="relative flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors px-3 py-1.5 text-xs font-bold"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {expanded ? "Recolher análise" : "Entender melhor"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-3 py-1.5 text-xs font-bold"
        >
          <Wrench className="w-3.5 h-3.5" /> Como corrigir
        </button>
        <a
          href={data.docs}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 text-foreground hover:bg-background/80 transition-colors px-3 py-1.5 text-xs font-bold"
        >
          <BookOpen className="w-3.5 h-3.5" /> Documentação <ExternalLink className="w-3 h-3" />
        </a>
        {data.playStorePolicy && (
          <a
            href={data.playStorePolicy}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/60 text-foreground hover:bg-background/80 transition-colors px-3 py-1.5 text-xs font-bold"
          >
            <ShieldCheck className="w-3.5 h-3.5" /> Política Play Store <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </motion.article>
  );
}

export default function AiExplanationPanel({ items, typing = false }: Props) {
  const explanations = useMemo(() => generateBatchAiExplanations(items), [items]);

  if (!explanations.length) return null;

  const counts = explanations.reduce(
    (acc, e) => {
      acc[e.severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, safe: 0 } as Record<AiSeverity, number>,
  );

  return (
    <section className="card-aurora p-6 md:p-7 space-y-5 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-secondary/70 to-transparent" />
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-secondary font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Aurora Validator AI · Explicação inteligente
          </p>
          <h2 className="font-display text-2xl font-bold text-gradient-cyan">
            Por que cada item importa
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Cada permissão, vulnerabilidade e política Play Store detectada foi traduzida pela IA em linguagem clara — com impacto, risco e como corrigir.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-bold text-destructive">
            <ShieldAlert className="w-3.5 h-3.5" /> {counts.critical} Crítico
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-bold text-primary">
            <AlertTriangle className="w-3.5 h-3.5" /> {counts.warning} Atenção
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-secondary/5 px-3 py-1 text-xs font-bold text-secondary">
            <ShieldCheck className="w-3.5 h-3.5" /> {counts.safe} Seguro
          </span>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {explanations.map((data, idx) => (
          <ExplanationCard key={`${data.key}-${idx}`} data={data} typing={typing && idx < 2} />
        ))}
      </div>
    </section>
  );
}
