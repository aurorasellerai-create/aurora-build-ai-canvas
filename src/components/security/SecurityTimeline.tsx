import { useEffect, useState } from "react";
import { Clock, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { listHistory, subscribeHistory, type SecurityHistoryEntry } from "@/lib/securityHistory";
import { badgeFor, badgeLabel, type SecurityBadge } from "@/lib/securityScore";

const ICONS: Record<SecurityBadge | string, JSX.Element> = {
  secure: <ShieldCheck className="h-4 w-4" />,
  attention: <Sparkles className="h-4 w-4" />,
  critical: <ShieldAlert className="h-4 w-4" />,
};

export function SecurityTimeline({ projectId }: { projectId?: string }) {
  const [entries, setEntries] = useState<SecurityHistoryEntry[]>(() => listHistory(projectId));

  useEffect(() => {
    setEntries(listHistory(projectId));
    return subscribeHistory(() => setEntries(listHistory(projectId)));
  }, [projectId]);

  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-muted-foreground">
        Nenhuma análise registrada ainda. Execute uma verificação para iniciar o histórico.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-white/10 pl-6">
      {entries.map((entry) => {
        const meta = badgeFor(entry.score);
        return (
          <li key={entry.id} className="relative">
            <span
              className="absolute -left-[34px] top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-white/20"
              style={{ background: meta.color, boxShadow: meta.glow }}
            >
              <span className="text-background">{ICONS[entry.badge] ?? ICONS.attention}</span>
            </span>
            <div className="rounded-xl border border-white/10 bg-background/60 p-4 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(entry.createdAt).toLocaleString("pt-BR")}
                </div>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ color: meta.color, border: `1px solid ${meta.color}` }}
                >
                  {entry.score}/100 · {badgeLabel[entry.badge as SecurityBadge] ?? entry.badge}
                </span>
              </div>
              <p className="mt-2 text-sm text-foreground">{entry.summary}</p>
              {entry.changes && entry.changes.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
