import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";
import { SECURITY_RESPONSE_HEADERS } from "../_shared/safeFetch.ts";
import { readJsonCapped, PayloadTooLargeError, InvalidJsonError } from "../_shared/payloadGuard.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.hostname.endsWith(".lovable.app") || url.hostname.endsWith(".lovableproject.com");
  } catch {
    return false;
  }
}

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    ...SECURITY_RESPONSE_HEADERS,
  };
}


const BodySchema = z.object({
  url: z.string().trim().url({ message: "URL inválida" }).startsWith("https://", { message: "URL deve usar HTTPS" }),
  correlation_id: z.string().trim().min(4).max(64).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

    const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    console.log("[CONVERT] Starting convert-app execution");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[CONVERT] Missing internal backend configuration");
      return respond({ success: false, error: "Configuração interna indisponível", step: "client_setup" });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ success: false, error: "Não autorizado", step: "auth" });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("[CONVERT] Invalid auth token", authError);
      return respond({ success: false, error: "Token inválido", step: "auth" });
    }

    // Burst protection: 3 builds / 60s per user
    const rl = await checkRateLimit(supabase, {
      endpoint: "convert-app",
      identity: user.id,
      max: 3,
      windowSeconds: 60,
    });
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "Muitas conversões em sequência. Aguarde alguns segundos.", retry_after_seconds: rl.retryAfterSeconds, step: "rate_limit" }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    // Validate body
    let body: unknown;
    try {
      body = await readJsonCapped(req, 16 * 1024); // 16 KiB — URL + metadata only
    } catch (e) {
      if (e instanceof PayloadTooLargeError) return respond({ success: false, error: e.message, step: "input_parsing" }, 413);
      if (e instanceof InvalidJsonError) return respond({ success: false, error: "Body JSON inválido", step: "input_parsing" }, 400);
      return respond({ success: false, error: "Body JSON inválido", step: "input_parsing" });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return respond({ success: false, error: "Dados inválidos", step: "input_validation", details: parsed.error.flatten().fieldErrors });
    }

    const { url, correlation_id: clientCid } = parsed.data;
    const correlationId = clientCid || crypto.randomUUID();
    console.log(`[CONVERT] [cid=${correlationId}] Creating job for ${url}`);

    // Server-side enforcement: build quota + credit consumption (cannot be bypassed by direct API calls)
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: buildOk, error: buildErr } = await userClient.rpc("check_and_increment_build", { p_user_id: user.id });
    if (buildErr) {
      console.error("[CONVERT] build-limit check failed:", buildErr.message);
      return respond({ success: false, error: "Falha ao validar limite de builds.", step: "quota" }, 500);
    }
    if (!buildOk) {
      return respond({ success: false, error: "Limite diário de builds atingido para o seu plano.", step: "quota" }, 402);
    }
    const { data: creditsOk, error: creditsErr } = await userClient.rpc("consume_credits", {
      p_user_id: user.id,
      p_action: "convert_app",
      p_amount: 1,
    });
    if (creditsErr) {
      console.error("[CONVERT] credit consumption failed:", creditsErr.message);
      return respond({ success: false, error: "Falha ao validar créditos.", step: "credits" }, 500);
    }
    if (!creditsOk) {
      return respond({ success: false, error: "Créditos insuficientes para iniciar a conversão.", step: "credits" }, 402);
    }

    // Create job record
    const { data: job, error: insertErr } = await supabase
      .from("conversion_jobs")
      .insert({
        user_id: user.id,
        source_url: url,
        status: "queued",
        progress: 0,
        step_label: "Build na fila...",
        build_stage: "queued",
        started_at: new Date().toISOString(),
        correlation_id: correlationId,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[CONVERT] Failed to create job:", insertErr.message);
      return respond({ success: false, error: "Falha ao criar job", step: "job_creation", details: insertErr.message });
    }

    console.log(`[CONVERT] Job created: ${job.id}`);

    // Invoke process-app as a SEPARATE function (won't be killed when this function returns)
    const processUrl = `${supabaseUrl}/functions/v1/process-app`;
    console.log(`[CONVERT] Triggering process-app for job ${job.id}`);
    const dispatchProcess = fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_id: job.id, url }),
    }).then(async (response) => {
      const payload = await response.text();
      console.log("[CONVERT] process-app response:", payload);

      if (!response.ok) {
        console.error(`[CONVERT] process-app HTTP error for job ${job.id}:`, response.status);
        await supabase.from("conversion_jobs").update({
          status: "failed",
          step_label: "Falha ao iniciar worker",
          error_message: `Worker retornou HTTP ${response.status}`,
          final_stage: "queued",
          finished_at: new Date().toISOString(),
          stderr_log: payload,
          last_log: payload.slice(-500),
        }).eq("id", job.id);
      }
    }).catch(async (err) => {
      console.error("Failed to invoke process-app:", err.message);
      await supabase.from("conversion_jobs").update({
        status: "failed",
        step_label: "Falha ao iniciar worker",
        error_message: "Falha ao iniciar o processamento interno.",
        final_stage: "queued",
        finished_at: new Date().toISOString(),
        stderr_log: err.message,
        last_log: err.message,
      }).eq("id", job.id);
    });
    EdgeRuntime.waitUntil(dispatchProcess);

    return respond({ success: true, job_id: job.id, message: "Processo iniciado" }, 202);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[CONVERT] Fatal error:", err);
    return respond({ success: false, error: "Erro interno do servidor", step: "global_catch", details: errorMessage });
  }
});
