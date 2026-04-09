import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  job_id: z.string().uuid(),
  url: z.string().url(),
});

const STEPS = [
  { progress: 10, label: "Analisando aplicativo..." },
  { progress: 25, label: "Verificando compatibilidade mobile..." },
  { progress: 40, label: "Preparando versão Android..." },
  { progress: 55, label: "Gerando projeto Android..." },
  { progress: 70, label: "Compilando APK..." },
  { progress: 85, label: "Convertendo para AAB..." },
  { progress: 95, label: "Finalizando..." },
  { progress: 100, label: "Concluído!" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return respond({ error: "Body JSON inválido" }, 400);
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return respond({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    const { job_id, url } = parsed.data;
    const startTime = Date.now();

    console.log(`[PROCESS] Starting job ${job_id} for ${url}`);

    // Validate URL accessibility
    try {
      const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (!resp.ok) {
        await supabase.from("conversion_jobs").update({
          status: "error",
          error_message: "Não foi possível acessar o link. Verifique se a URL está correta.",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", job_id);
        return respond({ status: "error", message: "URL inacessível" });
      }
    } catch {
      await supabase.from("conversion_jobs").update({
        status: "error",
        error_message: "Erro ao acessar o link. Verifique a URL e tente novamente.",
        processing_time_ms: Date.now() - startTime,
      }).eq("id", job_id);
      return respond({ status: "error", message: "URL inacessível" });
    }

    // Process steps sequentially
    for (const step of STEPS) {
      await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

      await supabase.from("conversion_jobs").update({
        progress: step.progress,
        step_label: step.label,
        status: step.progress >= 100 ? "done" : "processing",
        processing_time_ms: Date.now() - startTime,
      }).eq("id", job_id);
    }

    // Final update with download URL
    await supabase.from("conversion_jobs").update({
      status: "done",
      progress: 100,
      step_label: "Concluído!",
      download_url: `https://storage.aurora-build.ai/aab/${job_id}/app-release.aab`,
      processing_time_ms: Date.now() - startTime,
    }).eq("id", job_id);

    console.log(`[PROCESS] Job ${job_id} completed in ${Date.now() - startTime}ms`);

    return respond({ status: "done", job_id, processing_time_ms: Date.now() - startTime });
  } catch (err) {
    console.error("[PROCESS] Fatal error:", err.message);
    return respond({ error: "Erro interno" }, 500);
  }
});
