import type { AuroraAppFormat } from "@/lib/appFormatPreference";

export type ValidatorStatus = "approved" | "warning" | "blocked";

export type ValidatorHistoryItem = {
  id: string;
  appName: string;
  status: ValidatorStatus;
  createdAt: string;
  issuesCount: number;
  warningCount: number;
  summary: string;
  appFormat?: AuroraAppFormat;
  baseValidationId?: string;
  rerunCount?: number;
};

const STORAGE_KEY = "aurora-validator-history";

export const validatorStatusLabel: Record<ValidatorStatus, string> = {
  approved: "Aprovado",
  warning: "Atenção",
  blocked: "Correção necessária",
};

export const getValidatorHistory = (): ValidatorHistoryItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveValidatorHistoryItem = (item: ValidatorHistoryItem) => {
  if (typeof window === "undefined") return;

  const current = getValidatorHistory();
  const next = [item, ...current.filter((entry) => entry.id !== item.id)].slice(0, 10);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("aurora-validator-history-updated"));
};

export const getValidatorHistoryItem = (id?: string) => {
  const history = getValidatorHistory();
  if (!id || id === "latest") return history[0] ?? null;
  return history.find((item) => item.id === id) ?? null;
};

export const reexecuteValidatorHistoryItem = (item: ValidatorHistoryItem) => {
  const rerunCount = (item.rerunCount ?? 0) + 1;
  const nextItem: ValidatorHistoryItem = {
    ...item,
    id: `validator-${Date.now()}`,
    createdAt: new Date().toISOString(),
    appName: `${item.appName} · Revalidação ${rerunCount}`,
    summary: `${item.summary} · Diagnóstico anterior reutilizado como base`,
    baseValidationId: item.baseValidationId ?? item.id,
    rerunCount,
  };

  saveValidatorHistoryItem(nextItem);
  return nextItem;
};
