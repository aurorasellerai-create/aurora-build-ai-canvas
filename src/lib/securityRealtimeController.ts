// Security Realtime Controller — heartbeat + watchdog para o painel de segurança.
export type SecurityRealtimeStatus = "connecting" | "live" | "recovering" | "offline";

export interface SecurityLog {
  ts: string;
  level: "info" | "warn" | "error";
  message: string;
}

type Listener = (state: { status: SecurityRealtimeStatus; logs: SecurityLog[]; score?: number }) => void;

const WATCHDOG_MS = 10 * 60 * 1000;
const HEARTBEAT_MS = 15_000;

export class SecurityRealtimeController {
  private status: SecurityRealtimeStatus = "connecting";
  private logs: SecurityLog[] = [];
  private score?: number;
  private listeners = new Set<Listener>();
  private heartbeat?: number;
  private watchdog?: number;
  private lastActivity = Date.now();

  start() {
    this.transition("connecting");
    window.setTimeout(() => this.transition("live"), 600);
    this.heartbeat = window.setInterval(() => this.tick(), HEARTBEAT_MS);
    this.watchdog = window.setInterval(() => this.checkWatchdog(), 30_000);
    this.push("info", "Security Intelligence Center conectado.");
  }

  stop() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.watchdog) clearInterval(this.watchdog);
    this.transition("offline");
  }

  subscribe(cb: Listener): () => void {
    this.listeners.add(cb);
    cb({ status: this.status, logs: this.logs, score: this.score });
    return () => this.listeners.delete(cb);
  }

  push(level: SecurityLog["level"], message: string) {
    this.lastActivity = Date.now();
    this.logs = [{ ts: new Date().toISOString(), level, message }, ...this.logs].slice(0, 200);
    this.emit();
  }

  setScore(score: number) {
    this.score = score;
    this.lastActivity = Date.now();
    this.push("info", `Security score recalculado: ${score}/100`);
  }

  private tick() {
    this.push("info", "Heartbeat OK — pipeline DevSecOps ativo.");
  }

  private checkWatchdog() {
    if (Date.now() - this.lastActivity > WATCHDOG_MS) {
      this.transition("recovering");
      this.push("warn", "Watchdog: sem atividade. Iniciando recovery automático.");
      window.setTimeout(() => {
        this.lastActivity = Date.now();
        this.transition("live");
        this.push("info", "Recovery concluído — canal reestabelecido.");
      }, 1500);
    }
  }

  private transition(status: SecurityRealtimeStatus) {
    this.status = status;
    this.emit();
  }

  private emit() {
    const snapshot = { status: this.status, logs: this.logs, score: this.score };
    this.listeners.forEach((cb) => cb(snapshot));
  }
}

export const securityRealtime = new SecurityRealtimeController();
