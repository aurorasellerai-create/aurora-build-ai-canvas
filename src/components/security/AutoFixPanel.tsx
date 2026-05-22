import { useState } from "react";
import { Wand2, Undo2, CheckCircle2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AUTO_FIXES, applyFix, listAppliedFixes, rollbackFix, type AutoFixId } from "@/lib/autoFixEngine";

const SEVERITY_COLOR = {
  low: "hsl(200 80% 60%)",
  medium: "hsl(45 100% 60%)",
  high: "hsl(0 90% 60%)",
} as const;

export function AutoFixPanel({ suggestedIds }: { suggestedIds?: AutoFixId[] }) {
  const [applied, setApplied] = useState(() => listAppliedFixes());
  const [openId, setOpenId] = useState<AutoFixId | null>(null);

  const items = (suggestedIds && suggestedIds.length > 0
    ? suggestedIds
    : (Object.keys(AUTO_FIXES) as AutoFixId[]));

  function handleApply(id: AutoFixId) {
    applyFix(id);
    setApplied(listAppliedFixes());
    toast.success("Correção aplicada", { description: AUTO_FIXES[id].title });
  }
  function handleRollback(id: AutoFixId) {
    rollbackFix(id);
    setApplied(listAppliedFixes());
    toast.info("Rollback registrado", { description: AUTO_FIXES[id].title });
  }

  return (
    <div className="space-y-3">
      {items.map((id) => {
        const fix = AUTO_FIXES[id];
        const isApplied = applied.find((f) => f.id === id && !f.rolledBack);
        const isOpen = openId === id;
        const color = SEVERITY_COLOR[fix.severity];
        return (
          <div key={id} className="overflow-hidden rounded-xl border border-white/10 bg-background/60 backdrop-blur">
            <button onClick={() => setOpenId(isOpen ? null : id)}
              className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-white/5">
              <div className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${color}20`, color }}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{fix.title}</h4>
                  {isApplied && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> aplicada
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fix.description}</p>
              </div>
              <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                style={{ color, borderColor: color }}>
                {fix.severity}
              </span>
            </button>

            {isOpen && (
              <div className="space-y-3 border-t border-white/10 bg-black/30 p-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Impacto:</strong> {fix.impact}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <DiffBlock title="Antes" color="hsl(0 70% 60%)" content={fix.before} />
                  <DiffBlock title="Depois" color="hsl(150 70% 55%)" content={fix.after} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isApplied ? (
                    <Button onClick={() => handleApply(id)} className="bg-cyan-500 text-background hover:bg-cyan-400">
                      <Wand2 className="mr-2 h-4 w-4" /> Aplicar correção
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => handleRollback(id)}>
                      <Undo2 className="mr-2 h-4 w-4" /> Reverter
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DiffBlock({ title, color, content }: { title: string; color: string; content: string }) {
  return (
    <div className="rounded-lg border border-white/10">
      <div className="border-b border-white/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
           style={{ color }}>{title}</div>
      <pre className="overflow-auto p-3 text-[11px] leading-relaxed text-foreground/90"><code>{content}</code></pre>
    </div>
  );
}
