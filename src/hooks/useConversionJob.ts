import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const STORAGE_KEY = "aurora_active_job";
const POLL_INTERVAL_MS = 3000;
const REALTIME_CONNECT_TIMEOUT_MS = 5000;
const JOB_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes

export type ConversionStatus =
  | "idle"
  | "submitting"
  | "processing"
  | "reconnecting"
  | "success"
  | "error"
  | "timeout";

interface JobState {
  jobId: string | null;
  status: ConversionStatus;
  progress: number;
  stepLabel: string;
  errorMessage: string | null;
  downloadUrl: string | null;
}

const initialState: JobState = {
  jobId: null,
  status: "idle",
  progress: 0,
  stepLabel: "",
  errorMessage: null,
  downloadUrl: null,
};

function persistJob(jobId: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId, ts: Date.now() }));
  } catch { /* storage unavailable */ }
}

function clearPersistedJob() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

function loadPersistedJob(): string | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { jobId, ts } = JSON.parse(raw);
    // Ignore jobs older than timeout
    if (Date.now() - ts > JOB_TIMEOUT_MS) {
      clearPersistedJob();
      return null;
    }
    return jobId ?? null;
  } catch {
    return null;
  }
}

export function useConversionJob() {
  const [state, setState] = useState<JobState>(initialState);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const realtimeConnected = useRef(false);
  const mountedRef = useRef(true);

  const safeSet = useCallback((updater: Partial<JobState> | ((prev: JobState) => Partial<JobState>)) => {
    if (!mountedRef.current) return;
    setState((prev) => {
      const patch = typeof updater === "function" ? updater(prev) : updater;
      return { ...prev, ...patch };
    });
  }, []);

  // --- Cleanup helpers ---
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopRealtime = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    realtimeConnected.current = false;
  }, []);

  const stopTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cleanupAll = useCallback(() => {
    stopPolling();
    stopRealtime();
    stopTimeout();
  }, [stopPolling, stopRealtime, stopTimeout]);

  // --- Process a row from the DB ---
  const processRow = useCallback(
    (row: { status: string; progress: number; step_label: string | null; error_message: string | null; download_url: string | null }) => {
      safeSet({
        progress: row.progress ?? 0,
        stepLabel: row.step_label ?? "Processando...",
      });

      if (row.status === "done") {
        cleanupAll();
        clearPersistedJob();
        safeSet({
          status: "success",
          progress: 100,
          stepLabel: "Concluído!",
          downloadUrl: row.download_url,
        });
        toast({ title: "App Android gerado! 🚀", description: "Seu arquivo AAB está pronto." });
      } else if (row.status === "error") {
        cleanupAll();
        clearPersistedJob();
        safeSet({
          status: "error",
          errorMessage: row.error_message || "Erro inesperado.",
        });
        toast({ title: "Erro na conversão", description: row.error_message || "Tente novamente.", variant: "destructive" });
      }
    },
    [safeSet, cleanupAll],
  );

  // --- Polling fallback ---
  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      console.log("[CONVERT] Starting polling fallback for", jobId);

      pollRef.current = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from("conversion_jobs")
            .select("status, progress, step_label, error_message, download_url")
            .eq("id", jobId)
            .maybeSingle();

          if (error || !data) return;
          processRow(data);
        } catch (err) {
          console.error("[CONVERT] Polling error:", err);
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling, processRow],
  );

  // --- Realtime subscription ---
  const startRealtime = useCallback(
    (jobId: string) => {
      stopRealtime();
      realtimeConnected.current = false;

      const channel = supabase
        .channel(`job-${jobId}-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversion_jobs",
            filter: `id=eq.${jobId}`,
          },
          (payload) => {
            if (!realtimeConnected.current) {
              realtimeConnected.current = true;
              stopPolling(); // Realtime is working, stop polling
              console.log("[CONVERT] Realtime connected, polling stopped");
            }
            processRow(payload.new as any);
          },
        )
        .subscribe((status) => {
          console.log("[CONVERT] Realtime subscription status:", status);
          if (status === "SUBSCRIBED") {
            realtimeConnected.current = true;
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            realtimeConnected.current = false;
            safeSet({ status: "reconnecting" });
            // Fallback to polling
            startPolling(jobId);
            // Try to reconnect after a delay
            setTimeout(() => {
              if (mountedRef.current && !realtimeConnected.current) {
                startRealtime(jobId);
              }
            }, 5000);
          }
        });

      channelRef.current = channel;

      // If realtime doesn't connect within timeout, start polling
      setTimeout(() => {
        if (!realtimeConnected.current && mountedRef.current) {
          console.log("[CONVERT] Realtime timeout, starting polling");
          startPolling(jobId);
        }
      }, REALTIME_CONNECT_TIMEOUT_MS);
    },
    [stopRealtime, stopPolling, startPolling, processRow, safeSet],
  );

  // --- Start watching a job ---
  const watchJob = useCallback(
    (jobId: string) => {
      console.log("[CONVERT] Watching job:", jobId);
      startRealtime(jobId);
      // Also start polling immediately as insurance
      startPolling(jobId);

      // Global timeout
      stopTimeout();
      timeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          safeSet((prev) => {
            if (prev.status === "processing" || prev.status === "reconnecting") {
              return { status: "timeout", errorMessage: "Processamento demorando mais que o esperado. Tente novamente." };
            }
            return {};
          });
          cleanupAll();
          clearPersistedJob();
        }
      }, JOB_TIMEOUT_MS);
    },
    [startRealtime, startPolling, stopTimeout, safeSet, cleanupAll],
  );

  // --- Submit conversion ---
  const submit = useCallback(
    async (url: string): Promise<boolean> => {
      // Double-submit protection
      if (state.status === "submitting" || state.status === "processing") {
        console.warn("[CONVERT] Already submitting/processing, ignoring");
        return false;
      }

      safeSet({ status: "submitting", errorMessage: null, progress: 0, stepLabel: "Iniciando conversão..." });

      try {
        const { data, error } = await supabase.functions.invoke("convert-app", {
          body: { url },
        });

        if (error) throw new Error(error.message || "Erro ao chamar serviço");

        if (!data?.job_id) {
          const msg = data?.error || "Falha ao iniciar conversão.";
          safeSet({ status: "error", errorMessage: msg });
          toast({ title: "Erro", description: msg, variant: "destructive" });
          return false;
        }

        const jobId = data.job_id;
        console.log("[CONVERT] Job created:", jobId);

        persistJob(jobId);
        safeSet({ jobId, status: "processing", progress: 0, stepLabel: "Iniciando processamento..." });
        watchJob(jobId);
        return true;
      } catch (err: any) {
        console.error("[CONVERT] Submit error:", err);
        const msg = err?.message || "Erro inesperado. Tente novamente.";
        safeSet({ status: "error", errorMessage: msg });
        toast({ title: "Erro ao iniciar conversão", description: msg, variant: "destructive" });
        return false;
      }
    },
    [state.status, safeSet, watchJob],
  );

  // --- Reset ---
  const reset = useCallback(() => {
    cleanupAll();
    clearPersistedJob();
    setState(initialState);
  }, [cleanupAll]);

  // --- Restore persisted job on mount ---
  useEffect(() => {
    mountedRef.current = true;
    const persistedJobId = loadPersistedJob();
    if (persistedJobId) {
      console.log("[CONVERT] Restoring persisted job:", persistedJobId);

      // Fetch current state from DB first
      (async () => {
        try {
          const { data, error } = await supabase
            .from("conversion_jobs")
            .select("status, progress, step_label, error_message, download_url")
            .eq("id", persistedJobId)
            .maybeSingle();

          if (error || !data) {
            clearPersistedJob();
            return;
          }

          if (data.status === "done") {
            safeSet({
              jobId: persistedJobId,
              status: "success",
              progress: 100,
              stepLabel: "Concluído!",
              downloadUrl: data.download_url,
            });
            clearPersistedJob();
            return;
          }

          if (data.status === "error") {
            safeSet({
              jobId: persistedJobId,
              status: "error",
              errorMessage: data.error_message || "Erro inesperado.",
            });
            clearPersistedJob();
            return;
          }

          // Still processing — resume watching
          safeSet({
            jobId: persistedJobId,
            status: "processing",
            progress: data.progress ?? 0,
            stepLabel: data.step_label ?? "Processando...",
          });
          watchJob(persistedJobId);
        } catch (err) {
          console.error("[CONVERT] Failed to restore job:", err);
          clearPersistedJob();
        }
      })();
    }

    return () => {
      mountedRef.current = false;
      cleanupAll();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    submit,
    reset,
    isSubmitting: state.status === "submitting",
    isProcessing: state.status === "processing" || state.status === "reconnecting",
    isFinished: state.status === "success" || state.status === "error" || state.status === "timeout",
  };
}
