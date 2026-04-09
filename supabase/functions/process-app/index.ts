import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

// ---------- helpers ----------

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
    await supabase
      .from("conversion_jobs")
      .update({
        status: "error",
        step_label: "Erro na conversão",
        error_message: message,
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);
  } catch (updateError) {
    console.error(`[PROCESS] Failed to mark job ${jobId} as error at ${step}:`, updateError);
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

// ---------- AAB file generation & upload ----------

/**
 * Generates a minimal placeholder AAB (ZIP-based) and uploads it to storage.
 * Returns the public download URL.
 */
const generateAndUploadAAB = async (
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  sourceUrl: string,
  supabaseUrl: string,
): Promise<string> => {
  // Create a minimal placeholder file content
  // In production this would be a real AAB compiled from the source URL
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
  const filePath = `${jobId}/app-release.aab`;

  console.log(`[PROCESS] Uploading AAB to storage: aab-files/${filePath}`);

  const { error: uploadError } = await supabase.storage
    .from("aab-files")
    .upload(filePath, fileContent, {
      contentType: "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Falha no upload do arquivo: ${uploadError.message}`);
  }

  // Build the public URL
  const { data: publicUrlData } = supabase.storage
    .from("aab-files")
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("Não foi possível gerar a URL de download.");
  }

  console.log(`[PROCESS] AAB uploaded successfully: ${publicUrlData.publicUrl}`);
  return publicUrlData.publicUrl;
};

// ---------- main handler ----------

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
      return respond({ success: false, error: "Configuração interna indisponível.", step: currentStep });
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
      .select("id")
      .eq("id", jobId)
      .maybeSingle();

    if (lookupError || !existingJob) {
      return respond({ success: false, error: "Job não encontrado.", step: currentStep, job_id: jobId });
    }

    // --- mark as processing ---
    currentStep = "job_update_start";
    const { error: startUpdateError } = await supabase
      .from("conversion_jobs")
      .update({ status: "processing", progress: 0, step_label: "Iniciando conversão...", error_message: null, processing_time_ms: 0 })
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
    currentStep = "processing";
    for (const step of STEPS) {
      await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
      const { error: progressError } = await supabase
        .from("conversion_jobs")
        .update({ progress: step.progress, step_label: step.label, status: "processing", processing_time_ms: Date.now() - startTime })
        .eq("id", jobId);
      if (progressError) throw new Error(`Falha ao atualizar progresso: ${progressError.message}`);
    }

    // --- generate file & upload to storage ---
    currentStep = "file_upload";
    console.log(`[PROCESS] Generating and uploading AAB for job ${jobId}`);
    const downloadUrl = await generateAndUploadAAB(supabase, jobId, url, supabaseUrl);

    // --- finalize job ---
    currentStep = "finalization";
    const { error: finalUpdateError } = await supabase
      .from("conversion_jobs")
      .update({
        status: "done",
        progress: 100,
        step_label: "Concluído!",
        download_url: downloadUrl,
        processing_time_ms: Date.now() - startTime,
      })
      .eq("id", jobId);

    if (finalUpdateError) throw new Error(`Falha ao finalizar job: ${finalUpdateError.message}`);

    console.log(`[PROCESS] Job ${jobId} completed in ${Date.now() - startTime}ms — download: ${downloadUrl}`);
    return respond({ success: true, job_id: jobId, download_url: downloadUrl, message: "Processamento concluído com sucesso." });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`[PROCESS] Unexpected error at step ${currentStep}:`, error);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (jobId && supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);
      await markJobAsFailed(supabase, jobId, errorMessage, currentStep, startTime);
    }

    return respond({ success: false, error: "Falha interna durante o processamento.", step: currentStep, job_id: jobId });
  }
});
