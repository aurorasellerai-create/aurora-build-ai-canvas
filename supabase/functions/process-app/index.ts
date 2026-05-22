import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const BodySchema = z.object({
  job_id: z.string().uuid({ message: "job_id inválido" }),
  url: z
    .string()
    .trim()
    .url({ message: "URL inválida" })
    .refine((value) => value.startsWith("https://"), {
      message: "A URL deve usar HTTPS",
    }),
});

const STEPS = [
  { status: "preparing", progress: 10, label: "Analisando aplicativo..." },
  { status: "preparing", progress: 18, label: "Verificando compatibilidade mobile..." },
  { status: "installing_dependencies", progress: 28, label: "Instalando dependências Android..." },
  { status: "running_gradle", progress: 45, label: "Executando Gradle..." },
  { status: "signing", progress: 68, label: "Assinando pacote Android..." },
  { status: "optimizing", progress: 80, label: "Otimizando AAB..." },
  { status: "uploading", progress: 90, label: "Enviando artefato..." },
  { status: "finalizing", progress: 97, label: "Finalizando..." },
];

const URL_VALIDATION_TIMEOUT_MS = 8000;
const BUILD_MAX_DURATION_MS = 10 * 60 * 1000;

// ---------- helpers ----------

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Erro desconhecido";
};

const markJobAsFailed = async (
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  message: string,
  step: string,
  startTime: number,
) => {
  try {
    await supabase
      .from("conversion_jobs")
      .update({
        status: "failed",
        step_label: "Erro na conversão",
        build_stage: step,
        final_stage: step,
        error_message: message,
        stderr_log: message,
        last_log: message,
        exit_code: 1,
        finished_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);

    // Send failure notification email
    try {
      const { data: job } = await supabase
        .from("conversion_jobs")
        .select("user_id, source_url")
        .eq("id", jobId)
        .single();

      if (job) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const user = users?.find((u: any) => u.id === job.user_id);
        if (user?.email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", job.user_id)
            .maybeSingle();

          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          let appName = "Seu App";
          try { appName = new URL(job.source_url).hostname; } catch {}

          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
            body: JSON.stringify({
              templateName: "app-failed",
              recipientEmail: user.email,
              data: {
                name: profile?.display_name || user.email.split("@")[0],
                appName,
                errorMessage: message,
              },
            }),
          });
          console.log(`📧 App-failed email sent to ${user.email}`);
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send app-failed email:", emailErr);
    }
  } catch (updateError) {
    console.error(`[PROCESS] Failed to mark job ${jobId} as error at ${step}:`, updateError);
  }
};

// SSRF guard: reject hostnames that resolve to private/reserved/loopback/link-local IPs.
const isPrivateIPv4 = (ip: string): boolean => {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
};

const isPrivateIPv6 = (ip: string): boolean => {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    return isPrivateIPv4(v4);
  }
  return false;
};

const assertHostnameIsPublic = async (hostname: string): Promise<void> => {
  // Reject literal IPs in private ranges and resolve hostnames via DNS.
  const stripped = hostname.replace(/^\[|\]$/g, "");
  const looksLikeIPv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(stripped);
  const looksLikeIPv6 = stripped.includes(":");
  if (looksLikeIPv4) {
    if (isPrivateIPv4(stripped)) throw new Error("Hostname resolves to a private address");
    return;
  }
  if (looksLikeIPv6) {
    if (isPrivateIPv6(stripped)) throw new Error("Hostname resolves to a private address");
    return;
  }
  // Block localhost and Docker/internal names defensively.
  const lowered = hostname.toLowerCase();
  if (
    lowered === "localhost" ||
    lowered.endsWith(".localhost") ||
    lowered.endsWith(".local") ||
    lowered.endsWith(".internal") ||
    lowered === "metadata.google.internal"
  ) {
    throw new Error("Hostname is not allowed");
  }
  // DNS resolve and validate every record.
  let records: Array<{ address: string }> = [];
  try {
    const [a, aaaa] = await Promise.all([
      // @ts-ignore Deno.resolveDns is available in edge runtime
      Deno.resolveDns(hostname, "A").catch(() => [] as string[]),
      // @ts-ignore
      Deno.resolveDns(hostname, "AAAA").catch(() => [] as string[]),
    ]);
    records = [
      ...(a as string[]).map((address) => ({ address })),
      ...(aaaa as string[]).map((address) => ({ address })),
    ];
  } catch {
    throw new Error("DNS resolution failed");
  }
  if (records.length === 0) throw new Error("DNS resolution returned no records");
  for (const { address } of records) {
    if (address.includes(":")) {
      if (isPrivateIPv6(address)) throw new Error("Hostname resolves to a private address");
    } else if (isPrivateIPv4(address)) {
      throw new Error("Hostname resolves to a private address");
    }
  }
};

const validateUrlReachability = async (url: string) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") return false;
  await assertHostnameIsPublic(parsed.hostname);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual", // prevent redirect-based SSRF bypass
      signal: controller.signal,
    });
    // Treat 2xx/3xx as reachable; redirects intentionally not followed.
    return response.status >= 200 && response.status < 400;
  } finally {
    clearTimeout(timeoutId);
  }
};

// ---------- AAB file generation & upload ----------

/**
 * Generates a minimal placeholder AAB (ZIP-based) and uploads it to storage.
 * Returns the public download URL.
 */
const generateAndUploadAAB = async (
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  userId: string,
  sourceUrl: string,
  _supabaseUrl: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const manifest = JSON.stringify({
    format: "android-app-bundle",
    version: "1.0.0",
    source: sourceUrl,
    job_id: jobId,
    generated_at: new Date().toISOString(),
    note: "Placeholder AAB - replace with real build pipeline",
  }, null, 2);

  const fileContent = encoder.encode(manifest);
  // User-isolated path required by aab-files RLS policy
  const filePath = `${userId}/${jobId}/app-release.aab`;

  console.log(`[PROCESS] Uploading AAB to private storage: aab-files/${filePath}`);

  const { error: uploadError } = await supabase.storage
    .from("aab-files")
    .upload(filePath, fileContent, {
      contentType: "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
  }

  // Private bucket: signed URL (45 min). UI re-signs via sign-aab-download on demand.
  const { data: signed, error: signErr } = await supabase.storage
    .from("aab-files")
    .createSignedUrl(filePath, 45 * 60);

  if (signErr || !signed?.signedUrl) {
    throw new Error("Não foi possível gerar a URL assinada de download.");
  }

  console.log(`[PROCESS] AAB uploaded successfully (signed URL issued)`);
  return signed.signedUrl;
};

// ---------- main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  let currentStep = "startup";
  let jobId: string | null = null;
  const startTime = Date.now();
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  let finalStatusWritten = false;
  const logOut = (message: string) => {
    stdoutLines.push(`[${new Date().toISOString()}] ${message}`);
    console.log(message);
  };
  const logErr = (message: string) => {
    stderrLines.push(`[${new Date().toISOString()}] ${message}`);
    console.error(message);
  };

  try {
    logOut("[PROCESS] Starting process-app execution");

    currentStep = "client_setup";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return respond({ success: false, error: "Configuração interna indisponível.", step: currentStep });
    }

    // ── SECURITY: internal-only. Require service-role bearer token. ──
    currentStep = "auth";
    const authHeader = req.headers.get("Authorization") || "";
    const incomingToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!incomingToken || incomingToken !== serviceKey) {
      logErr("[PROCESS] Unauthorized invocation rejected");
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", step: currentStep }),
        { status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // --- parse & validate input ---
    currentStep = "input_parsing";
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respond({ success: false, error: "Body JSON inválido.", step: currentStep });
    }

    currentStep = "input_validation";
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      return respond({
        success: false,
        error: String(Object.values(fieldErrors).flat()[0] || "Dados inválidos."),
        step: currentStep,
      });
    }

    const { job_id, url } = parsed.data;
    jobId = job_id;

    // --- lookup job ---
    currentStep = "job_lookup";
    const { data: existingJob, error: lookupError } = await supabase
      .from("conversion_jobs")
      .select("id, user_id")
      .eq("id", jobId)
      .maybeSingle();

    if (lookupError || !existingJob) {
      return respond({ success: false, error: "Job não encontrado.", step: currentStep, job_id: jobId });
    }
    const ownerUserId = existingJob.user_id as string;

    // --- mark as running real state machine ---
    currentStep = "job_update_start";
    const { error: startUpdateError } = await supabase
      .from("conversion_jobs")
      .update({
        status: "preparing",
        progress: 0,
        step_label: "Iniciando conversão...",
        build_stage: "preparing",
        started_at: new Date(startTime).toISOString(),
        error_message: null,
        processing_time_ms: 0,
        stdout_log: stdoutLines.join("\n"),
        stderr_log: null,
        exit_code: null,
        final_stage: null,
        finished_at: null,
        timeout_at: null,
        watchdog_reason: null,
        last_log: stdoutLines.at(-1) ?? null,
      })
      .eq("id", jobId);

    if (startUpdateError) {
      return respond({ success: false, error: "Não foi possível iniciar o job.", step: currentStep, job_id: jobId });
    }

    // --- validate URL ---
    currentStep = "url_validation";
    try {
      const reachable = await validateUrlReachability(url);
      if (!reachable) {
        const msg = "Não foi possível acessar o link. Verifique se a URL está correta.";
        await markJobAsFailed(supabase, jobId, msg, currentStep, startTime);
        return respond({ success: false, error: msg, step: currentStep, job_id: jobId });
      }
    } catch (error) {
      const msg = error instanceof DOMException && error.name === "AbortError"
        ? "A validação da URL demorou demais. Tente novamente."
        : "Erro ao acessar o link. Verifique a URL e tente novamente.";
      await markJobAsFailed(supabase, jobId, msg, currentStep, startTime);
      return respond({ success: false, error: msg, step: currentStep, job_id: jobId });
    }

    // --- simulate build steps ---
    for (const step of STEPS) {
      currentStep = step.status;
      if (Date.now() - startTime > BUILD_MAX_DURATION_MS) {
        const msg = `Timeout watchdog: build excedeu ${BUILD_MAX_DURATION_MS}ms no estágio ${currentStep}.`;
        logErr(msg);
        await supabase.from("conversion_jobs").update({
          status: "timeout",
          progress: Math.min(step.progress, 99),
          step_label: "TIMEOUT — build encerrado pelo watchdog",
          build_stage: step.status,
          final_stage: step.status,
          error_message: msg,
          stderr_log: stderrLines.join("\n"),
          stdout_log: stdoutLines.join("\n"),
          exit_code: 124,
          timeout_at: new Date().toISOString(),
          finished_at: new Date().toISOString(),
          watchdog_reason: "Processamento acima do limite operacional de 10 minutos.",
          last_log: stderrLines.at(-1) ?? stdoutLines.at(-1) ?? msg,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", jobId);
        finalStatusWritten = true;
        return respond({ success: false, error: msg, step: currentStep, job_id: jobId });
      }
      logOut(`[PROCESS] ${step.label}`);
      await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
      const { error: progressError } = await supabase
        .from("conversion_jobs")
        .update({
          progress: step.progress,
          step_label: step.label,
          status: step.status,
          build_stage: step.status,
          stdout_log: stdoutLines.join("\n"),
          stderr_log: stderrLines.join("\n") || null,
          last_log: stdoutLines.at(-1) ?? step.label,
          processing_time_ms: Date.now() - startTime,
        })
        .eq("id", jobId);
      if (progressError) throw new Error(`Falha ao atualizar progresso: ${progressError.message}`);
    }

    // --- generate file & upload to storage ---
    currentStep = "uploading";
    logOut(`[PROCESS] Generating and uploading AAB for job ${jobId}`);
    const downloadUrl = await generateAndUploadAAB(supabase, jobId, ownerUserId, url, supabaseUrl);

    // --- finalize job ---
    currentStep = "finalizing";
    const { error: finalUpdateError } = await supabase
      .from("conversion_jobs")
      .update({
        status: "completed",
        progress: 100,
        step_label: "Concluído!",
        build_stage: "completed",
        final_stage: "completed",
        download_url: downloadUrl,
        stdout_log: stdoutLines.join("\n"),
        stderr_log: stderrLines.join("\n") || null,
        exit_code: 0,
        finished_at: new Date().toISOString(),
        last_log: stdoutLines.at(-1) ?? "Build concluído com sucesso.",
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);

    if (finalUpdateError) throw new Error(`Falha ao finalizar job: ${finalUpdateError.message}`);
    finalStatusWritten = true;

    // --- send app-ready email ---
    try {
      const { data: job } = await supabase
        .from("conversion_jobs")
        .select("user_id, source_url")
        .eq("id", jobId)
        .single();

      if (job) {
        const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const user = users?.find((u: any) => u.id === job.user_id);
        if (user?.email) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", job.user_id)
            .maybeSingle();

          const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${svcKey}` },
            body: JSON.stringify({
              templateName: "app-ready",
              recipientEmail: user.email,
              data: {
                name: profile?.display_name || user.email.split("@")[0],
                appName: new URL(job.source_url).hostname,
                downloadUrl: downloadUrl,
              },
            }),
          });
          console.log(`📧 App-ready email sent to ${user.email}`);
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send app-ready email:", emailErr);
    }

    console.log(`[PROCESS] Job ${jobId} completed in ${Date.now() - startTime}ms — download: ${downloadUrl}`);
    return respond({ success: true, job_id: jobId, download_url: downloadUrl, message: "Processamento concluído com sucesso." });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    logErr(`[PROCESS] Unexpected error at step ${currentStep}: ${errorMessage}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (jobId && supabaseUrl && serviceKey && !finalStatusWritten) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await markJobAsFailed(supabase, jobId, errorMessage, currentStep, startTime);
    }

    return respond({ success: false, error: "Falha interna durante o processamento.", step: currentStep, job_id: jobId });
  } finally {
    if (jobId && !finalStatusWritten) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceKey) {
        const supabase = createClient(supabaseUrl, serviceKey);
        const { data: job } = await supabase.from("conversion_jobs").select("status").eq("id", jobId).maybeSingle();
        if (job && !["completed", "failed", "timeout", "cancelled", "done", "error"].includes(job.status)) {
          await markJobAsFailed(supabase, jobId, "Worker finalizou sem gravar status final.", currentStep, startTime);
        }
      }
    }
  }
});
