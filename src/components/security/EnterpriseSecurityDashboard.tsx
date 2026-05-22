import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ShieldCheck, Cpu, Radar, FileSearch, ScrollText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  calculateSecurityScore, badgeFor, badgeLabel, type SecuritySignals, type SecurityScoreResult,
} from "@/lib/securityScore";
import { evaluatePlayStoreCompliance, complianceStatusLabel } from "@/lib/playStoreCompliance";
import { recordHistory } from "@/lib/securityHistory";
import { securityRealtime, type SecurityLog, type SecurityRealtimeStatus } from "@/lib/securityRealtimeController";
import { SecurityTimeline } from "./SecurityTimeline";
import { SecurityCopilot } from "./SecurityCopilot";
import { AutoFixPanel } from "./AutoFixPanel";
import type { AutoFixId } from "@/lib/autoFixEngine";

const DEMO_SIGNALS: SecuritySignals = {
  dangerousPermissions: ["android.permission.ACCESS_FINE_LOCATION", "android.permission.CAMERA"],
  totalPermissions: 14,
  hasSignature: true,
  signatureScheme: "v2",
  cleartextTraffic: false,
  targetSdk: 34,
  isDebugBuild: false,
  allowBackup: true,
  vulnerableDependencies: 1,
  totalDependencies: 42,
  exposedSecrets: 0,
  requestInstallPackages: false,
  foregroundServiceIssues: false,
  scopedStorageOk: true,
};

interface Props {
  projectId?: string;
  projectName?: string;
  signals?: SecuritySignals;
}

export function EnterpriseSecurityDashboard({
  projectId = "global",
  projectName = "Aurora Build AI",
  signals = DEMO_SIGNALS,
}: Props) {
  const [score, setScore] = useState<SecurityScoreResult>(() => calculateSecurityScore(signals));
  const compliance = useMemo(() => evaluatePlayStoreCompliance(signals), [signals]);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [status, setStatus] = useState<SecurityRealtimeStatus>("connecting");
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filter, setFilter] = useState<"all" | "warn" | "error">("all");
  const logsRef = useRef<HTMLDivElement>(null);

  // realtime
  useEffect(() => {
    securityRealtime.start();
    const unsub = securityRealtime.subscribe((s) => {
      setStatus(s.status);
      setLogs(s.logs);
    });
    return () => { unsub(); securityRealtime.stop(); };
  }, []);

  // score animation
  useEffect(() => {
    let frame = 0; const target = score.total;
    const id = window.setInterval(() => {
      frame += 2;
      setAnimatedScore((prev) => {
        const next = Math.min(target, prev + Math.ceil((target - prev) / 8) + 1);
        if (next >= target || frame > 80) { clearInterval(id); return target; }
        return next;
      });
    }, 24);
    return () => clearInterval(id);
  }, [score.total]);

  // auto-scroll logs
  useEffect(() => { logsRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [logs.length]);

  async function runScan() {
    securityRealtime.push("info", "Iniciando varredura completa...");
    await wait(400);
    securityRealtime.push("info", "Analisando manifesto...");
    await wait(500);
    securityRealtime.push("info", "Validando permissões e políticas Play Store...");
    await wait(500);
    const next = calculateSecurityScore(signals);
    setScore(next);
    securityRealtime.setScore(next.total);
    recordHistory({
      projectId,
      result: next,
      summary: `Varredura concluída — ${badgeLabel[next.badge]}`,
      changes: next.categories.flatMap((c) => c.reasons.slice(0, 1)),
    });
    securityRealtime.push("info", "Relatório de compliance atualizado.");
  }

  const suggestedFixes = useMemo<AutoFixId[]>(() => {
    const out: AutoFixId[] = [];
    if (signals.isDebugBuild) out.push("debug-keystore");
    if (signals.cleartextTraffic) out.push("cleartext-traffic");
    if (signals.allowBackup) out.push("allow-backup");
    if ((signals.targetSdk ?? 0) < 34) out.push("target-sdk");
    if (signals.signatureScheme === "v1") out.push("v1-signing");
    if (signals.dangerousPermissions?.includes("android.permission.WRITE_EXTERNAL_STORAGE")) out.push("write-external-storage");
    if (signals.requestInstallPackages) out.push("request-install-packages");
    return out;
  }, [signals]);

  const filteredLogs = logs.filter((l) => filter === "all" || l.level === filter);

  const meta = badgeFor(animatedScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-background/80 via-background/60 to-cyan-950/30 p-6 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl"
             style={{ background: meta.color }} />
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300">
              <Radar className="h-3.5 w-3.5" /> Security Intelligence Center
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{projectName}</h2>
            <p className="text-sm text-muted-foreground">DevSecOps · Compliance Play Store · Auto-fix IA</p>
            <div className="mt-4 flex items-center gap-3">
              <StatusPill status={status} />
              <Button onClick={runScan} className="bg-cyan-500 text-background hover:bg-cyan-400">
                <FileSearch className="mr-2 h-4 w-4" /> Nova análise
              </Button>
              <Button variant="outline" onClick={() => exportReport(score, logs)}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
            </div>
          </div>

          {/* Score Gauge */}
          <ScoreGauge score={animatedScore} color={meta.color} glow={meta.glow}
                      label={badgeLabel[badgeFor(animatedScore).badge]} />
        </div>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {score.categories.map((c) => {
          const m = badgeFor(c.score);
          return (
            <div key={c.key} className="rounded-2xl border border-white/10 bg-background/60 p-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <span className="text-lg font-bold" style={{ color: m.color, textShadow: m.glow }}>{c.score}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${c.score}%`, background: m.color, boxShadow: m.glow }} />
              </div>
              {c.reasons[0] && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.reasons[0]}</p>}
            </div>
          );
        })}
      </div>

      {/* Compliance + Logs */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 rounded-2xl border border-white/10 bg-background/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold">Play Store Compliance</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold" style={{ color: badgeFor(compliance.score).color }}>
                {compliance.score}%
              </span>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs">
                {complianceStatusLabel[compliance.status]}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {compliance.issues.length === 0 && (
              <p className="text-sm text-emerald-300">Nenhum bloqueio detectado para publicação.</p>
            )}
            {compliance.issues.map((i) => (
              <div key={i.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-[10px] uppercase tracking-wider text-amber-300">{i.severity}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{i.detail}</p>
                <p className="mt-1 text-xs text-cyan-300">→ {i.suggestion}</p>
                <a href={i.policyUrl} target="_blank" rel="noreferrer"
                   className="mt-1 inline-block text-[11px] underline text-cyan-300/80">Ver política Play Store</a>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-background/60 p-4 backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold text-sm">Log stream</h3>
            </div>
            <div className="flex gap-1 text-[10px]">
              {(["all", "warn", "error"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded px-1.5 py-0.5 uppercase tracking-wider transition ${
                    filter === f ? "bg-cyan-400/20 text-cyan-200" : "text-muted-foreground hover:text-foreground"
                  }`}>{f}</button>
              ))}
            </div>
          </div>
          <div ref={logsRef} className="h-64 space-y-1 overflow-auto rounded-lg border border-white/5 bg-black/40 p-2 font-mono text-[11px]">
            {filteredLogs.length === 0 && <p className="text-muted-foreground">Aguardando eventos...</p>}
            {filteredLogs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-muted-foreground">[{new Date(l.ts).toLocaleTimeString("pt-BR")}]</span>
                <span className={
                  l.level === "error" ? "text-red-400" :
                  l.level === "warn" ? "text-amber-300" : "text-cyan-200"
                }>{l.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-fix + Timeline + Copilot */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-2xl border border-white/10 bg-background/60 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold">Auto Fix Engine</h3>
              <span className="ml-auto rounded-full border border-cyan-400/30 px-2 py-0.5 text-[10px] text-cyan-300">
                {suggestedFixes.length > 0 ? `${suggestedFixes.length} sugestões` : "todas as correções"}
              </span>
            </div>
            <AutoFixPanel suggestedIds={suggestedFixes.length > 0 ? suggestedFixes : undefined} />
          </section>

          <section className="rounded-2xl border border-white/10 bg-background/60 p-5 backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-300" />
              <h3 className="font-semibold">Histórico de segurança</h3>
            </div>
            <SecurityTimeline projectId={projectId} />
          </section>
        </div>

        <div className="h-[640px]">
          <SecurityCopilot context={{ score: score.total }} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SecurityRealtimeStatus }) {
  const map = {
    connecting: { c: "hsl(45 100% 60%)", t: "Conectando" },
    live: { c: "hsl(150 90% 55%)", t: "Realtime ativo" },
    recovering: { c: "hsl(30 100% 60%)", t: "Recuperando" },
    offline: { c: "hsl(0 80% 55%)", t: "Offline" },
  }[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
          style={{ borderColor: map.c, color: map.c, boxShadow: `0 0 18px ${map.c}55` }}>
      <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: map.c }} />
      {map.t}
    </span>
  );
}

function ScoreGauge({ score, color, glow, label }: { score: number; color: string; glow: string; label: string }) {
  const radius = 64; const c = 2 * Math.PI * radius;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative flex flex-col items-center">
      <svg width="170" height="170" className="-rotate-90">
        <circle cx="85" cy="85" r={radius} stroke="hsl(0 0% 100% / 0.08)" strokeWidth="10" fill="none" />
        <circle cx="85" cy="85" r={radius} stroke={color} strokeWidth="10" fill="none"
                strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
                style={{ filter: `drop-shadow(${glow})`, transition: "stroke-dashoffset 0.6s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color, textShadow: glow }}>{score}</span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">de 100</span>
        <span className="mt-1 text-xs font-semibold" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

function wait(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function exportReport(score: SecurityScoreResult, logs: SecurityLog[]) {
  const payload = { score, logs, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `aurora-security-${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(url);
}
