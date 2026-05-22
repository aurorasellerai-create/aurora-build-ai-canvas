// Security History — persistência local + sincronização opcional via Supabase realtime
import type { SecurityScoreResult } from "./securityScore";

export interface SecurityHistoryEntry {
  id: string;
  projectId: string;
  score: number;
  badge: string;
  summary: string;
  changes?: string[];
  createdAt: string;
}

const KEY = "aurora:security:history";
const MAX_ENTRIES = 50;

function read(): SecurityHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as SecurityHistoryEntry[];
  } catch {
    return [];
  }
}

function write(entries: SecurityHistoryEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function listHistory(projectId?: string): SecurityHistoryEntry[] {
  const all = read();
  return projectId ? all.filter((e) => e.projectId === projectId) : all;
}

export function recordHistory(input: {
  projectId: string;
  result: SecurityScoreResult;
  summary: string;
  changes?: string[];
}): SecurityHistoryEntry {
  const entry: SecurityHistoryEntry = {
    id: crypto.randomUUID(),
    projectId: input.projectId,
    score: input.result.total,
    badge: input.result.badge,
    summary: input.summary,
    changes: input.changes,
    createdAt: new Date().toISOString(),
  };
  const all = read();
  all.unshift(entry);
  write(all);
  window.dispatchEvent(new CustomEvent("aurora:security:history-updated", { detail: entry }));
  return entry;
}

export function clearHistory(projectId?: string) {
  if (!projectId) {
    write([]);
    return;
  }
  write(read().filter((e) => e.projectId !== projectId));
}

export function subscribeHistory(cb: (entry: SecurityHistoryEntry) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<SecurityHistoryEntry>).detail);
  window.addEventListener("aurora:security:history-updated", handler);
  return () => window.removeEventListener("aurora:security:history-updated", handler);
}
