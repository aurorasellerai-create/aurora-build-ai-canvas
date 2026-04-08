import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Severity = "info" | "warning" | "error" | "critical";
type Category = "webhook" | "credits" | "build" | "ai" | "payment" | "navigation" | "performance" | "system" | "auth";

interface LogEntry {
  severity: Severity;
  category: Category;
  message: string;
  details?: Record<string, unknown>;
  resolved?: boolean;
  resolution_method?: string;
}

// Debounced queue to batch log writes
const logQueue: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

async function flushLogs() {
  if (logQueue.length === 0) return;
  const batch = logQueue.splice(0, logQueue.length);

  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;

    const rows = batch.map((entry) => ({
      ...entry,
      user_id: session.user.id,
      details: entry.details || {},
    }));

    await supabase.from("system_logs" as any).insert(rows);
  } catch {
    // Silent fail – monitoring should never break the app
  }
}

function queueLog(entry: LogEntry) {
  logQueue.push(entry);
  if (flushTimeout) clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushLogs, 3000);
}

// ── Auto-retry wrapper ──
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; category?: Category; label?: string } = {}
): Promise<T> {
  const { maxRetries = 2, category = "system", label = "operation" } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        queueLog({
          severity: "warning",
          category,
          message: `Auto-retry ${attempt + 1}/${maxRetries}: ${label}`,
          details: { error: String(err), attempt },
          resolved: true,
          resolution_method: "auto_retry",
        });
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  queueLog({
    severity: "error",
    category,
    message: `Failed after ${maxRetries} retries: ${label}`,
    details: { error: String(lastError) },
    resolved: false,
  });

  throw lastError;
}

// ── Performance monitor ──
function monitorPerformance() {
  if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 3000) {
          queueLog({
            severity: "warning",
            category: "performance",
            message: `Slow resource: ${entry.name}`,
            details: { duration: Math.round(entry.duration), type: entry.entryType },
          });
        }
      }
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    // Not all browsers support longtask
  }
}

// ── Global error listener ──
function setupGlobalErrorHandlers() {
  const handleError = (event: ErrorEvent) => {
    queueLog({
      severity: "error",
      category: "system",
      message: event.message || "Unhandled error",
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    queueLog({
      severity: "error",
      category: "system",
      message: `Unhandled promise rejection: ${String(event.reason)}`,
    });
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
  };
}

// ── Hook ──
export function useMonitoring() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    monitorPerformance();
    const cleanup = setupGlobalErrorHandlers();
    return cleanup;
  }, []);

  const logEvent = useCallback((entry: LogEntry) => {
    queueLog(entry);
  }, []);

  return { logEvent, withRetry };
}

// ── Standalone logger for non-component usage ──
export const systemLogger = {
  info: (category: Category, message: string, details?: Record<string, unknown>) =>
    queueLog({ severity: "info", category, message, details }),
  warn: (category: Category, message: string, details?: Record<string, unknown>) =>
    queueLog({ severity: "warning", category, message, details }),
  error: (category: Category, message: string, details?: Record<string, unknown>) =>
    queueLog({ severity: "error", category, message, details }),
  critical: (category: Category, message: string, details?: Record<string, unknown>) =>
    queueLog({ severity: "critical", category, message, details }),
};
