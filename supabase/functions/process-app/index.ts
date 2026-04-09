import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  { progress: 10, label: "Analisando aplicativo..." },
  { progress: 25, label: "Verificando compatibilidade mobile..." },
  { progress: 40, label: "Preparando versão Android..." },
  { progress: 55, label: "Gerando projeto Android..." },
  { progress: 70, label: "Compilando APK..." },
  { progress: 85, label: "Convertendo para AAB..." },
  { progress: 95, label: "Finalizando..." },
];

const URL_VALIDATION_TIMEOUT_MS = 8000;

const respond = (payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const { error } = await supabase
      .from("conversion_jobs")
      .update({
        status: "error",
        step_label: "Erro na conversão",
        error_message: message,
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);

    if (error) {
      console.error(`[PROCESS] Failed to mark job ${jobId} as error at ${step}:`, error.message);
    }
  } catch (updateError) {
    console.error(`[PROCESS] Unexpected failure while marking job ${jobId} as error:`, updateError);
  }
};

const validateUrlReachability = async (url: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), URL_VALIDATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    return response.ok;
  } finally {
    clearTimeout(timeoutId);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let currentStep = "startup";
  let jobId: string | null = null;
  const startTime = Date.now();

  try {
    console.log("[PROCESS] Starting process-app execution");

    currentStep = "client_setup";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[PROCESS] Missing internal backend configuration");
      return respond({
        success: false,
        error: "Configuração interna indisponível.",
        step: currentStep,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    currentStep = "input_parsing";
    let body: unknown;
    try {
      body = await req.json();
      console.log("[PROCESS] Input received:", JSON.stringify(body));
    } catch (error) {
      console.error("[PROCESS] Invalid JSON body:", error);
      return respond({
        success: false,
        error: "Body JSON inválido.",
        step: currentStep,
      });
    }

    currentStep = "input_validation";
    if (!body || typeof body !== "object") {
      console.error("[PROCESS] Missing request body");
      return respond({
        success: false,
        error: "Os dados da requisição são obrigatórios.",
        step: currentStep,
      });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMessage = Object.values(fieldErrors).flat()[0] || "Dados inválidos.";

      console.error("[PROCESS] Validation failed:", fieldErrors);
      return respond({
        success: false,
        error: errorMessage,
        step: currentStep,
        details: fieldErrors,
      });
    }

    const { job_id, url } = parsed.data;
    jobId = job_id;
    console.log(`[PROCESS] Input validated for job ${jobId}`);

    currentStep = "job_lookup";
    console.log(`[PROCESS] Checking job ${jobId} in database`);
    const { data: existingJob, error: lookupError } = await supabase
      .from("conversion_jobs")
      .select("id")
      .eq("id", jobId)
      .maybeSingle();

    if (lookupError || !existingJob) {
      console.error(`[PROCESS] Failed to find job ${jobId}:`, lookupError?.message || "Job não encontrado");
      return respond({
        success: false,
        error: "Não foi possível localizar o job da conversão.",
        step: currentStep,
        job_id: jobId,
      });
    }

    currentStep = "job_update_start";
    console.log(`[PROCESS] Marking job ${jobId} as processing`);
    const { error: startUpdateError } = await supabase
      .from("conversion_jobs")
      .update({
        status: "processing",
        progress: 0,
        step_label: "Iniciando conversão...",
        error_message: null,
        processing_time_ms: 0,
      })
      .eq("id", jobId);

    if (startUpdateError) {
      console.error(`[PROCESS] Failed to update job ${jobId} at start:`, startUpdateError.message);
      return respond({
        success: false,
        error: "Não foi possível iniciar o processamento do job.",
        step: currentStep,
        job_id: jobId,
      });
    }

    currentStep = "url_validation";
    console.log(`[PROCESS] Validating URL reachability for job ${jobId}`);
    try {
      const reachable = await validateUrlReachability(url);

      if (!reachable) {
        const message = "Não foi possível acessar o link. Verifique se a URL está correta.";
        console.error(`[PROCESS] URL validation failed for job ${jobId}: unreachable URL`);
        await markJobAsFailed(supabase, jobId, message, currentStep, startTime);
        return respond({
          success: false,
          error: message,
          step: currentStep,
          job_id: jobId,
        });
      }
    } catch (error) {
      const message = error instanceof DOMException && error.name === "AbortError"
        ? "A validação da URL demorou demais. Tente novamente."
        : "Erro ao acessar o link. Verifique a URL e tente novamente.";

      console.error(`[PROCESS] URL validation threw for job ${jobId}:`, error);
      await markJobAsFailed(supabase, jobId, message, currentStep, startTime);
      return respond({
        success: false,
        error: message,
        step: currentStep,
        job_id: jobId,
      });
    }

    currentStep = "processing";
    for (const step of STEPS) {
      console.log(`[PROCESS] Job ${jobId} progressing to ${step.progress}% - ${step.label}`);
      await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

      const { error: progressError } = await supabase
        .from("conversion_jobs")
        .update({
          progress: step.progress,
          step_label: step.label,
          status: "processing",
          processing_time_ms: Date.now() - startTime,
        })
        .eq("id", jobId);

      if (progressError) {
        throw new Error(`Falha ao atualizar progresso: ${progressError.message}`);
      }
    }

    currentStep = "finalization";
    console.log(`[PROCESS] Finalizing job ${jobId}`);
    const { error: finalUpdateError } = await supabase
      .from("conversion_jobs")
      .update({
        status: "done",
        progress: 100,
        step_label: "Concluído!",
        download_url: `https://storage.aurora-build.ai/aab/${jobId}/app-release.aab`,
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);

    if (finalUpdateError) {
      throw new Error(`Falha ao finalizar job: ${finalUpdateError.message}`);
    }

    console.log(`[PROCESS] Job ${jobId} completed in ${Date.now() - startTime}ms`);
    return respond({
      success: true,
      job_id: jobId,
      message: "Processo iniciado",
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`[PROCESS] Unexpected error at step ${currentStep}:`, error);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (jobId && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await markJobAsFailed(supabase, jobId, errorMessage, currentStep, startTime);
    }

    return respond({
      success: false,
      error: "Falha interna durante o processamento.",
      step: currentStep,
      job_id: jobId,
      details: errorMessage,
    });
  }
});
