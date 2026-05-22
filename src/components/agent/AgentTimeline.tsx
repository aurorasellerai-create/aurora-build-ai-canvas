import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { AgentTimelineEvent } from "@/lib/agentStateMachine";
import { AGENT_STATUS_COLORS } from "@/lib/agentStateMachine";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentTimelineProps {
  events: AgentTimelineEvent[];
  className?: string;
}

const impactIcon = {
  low: Clock,
  medium: Zap,
  high: AlertTriangle,
} as const;

export default function AgentTimeline({ events, className }: AgentTimelineProps) {
  return (
    <div className={`rounded-xl border border-primary/20 bg-background/60 backdrop-blur ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-primary/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_hsl(var(--primary))]" />
          <h3 className="font-display text-sm font-bold text-foreground">Timeline do Agente</h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{events.length} eventos</span>
      </div>

      <ScrollArea className="h-[280px]">
        <div className="relative px-4 py-3">
          <div className="absolute left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary/10 to-transparent" />
          <AnimatePresence initial={false}>
            {events.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-6 text-center">Aguardando primeiros eventos...</p>
            )}
            {events
              .slice()
              .reverse()
              .map((evt) => {
                const Icon = evt.impact ? impactIcon[evt.impact] : CheckCircle2;
                const color = evt.status ? AGENT_STATUS_COLORS[evt.status] : "hsl(var(--primary))";
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="relative pl-10 pr-2 py-2 group"
                  >
                    <div
                      className="absolute left-2 top-3 h-6 w-6 rounded-full border flex items-center justify-center"
                      style={{
                        borderColor: color,
                        background: `radial-gradient(circle, ${color}22, transparent 70%)`,
                        boxShadow: `0 0 12px ${color}66`,
                      }}
                    >
                      <Icon className="h-3 w-3" style={{ color }} />
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground">{evt.action}</p>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {evt.files && evt.files.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {evt.files.map((f) => (
                          <span
                            key={f}
                            className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-mono text-primary/90"
                          >
                            <FileCode2 className="h-2.5 w-2.5" />
                            {f.split("/").pop()}
                          </span>
                        ))}
                      </div>
                    )}
                    {evt.durationMs && (
                      <span className="text-[10px] text-muted-foreground">{(evt.durationMs / 1000).toFixed(1)}s</span>
                    )}
                  </motion.div>
                );
              })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
