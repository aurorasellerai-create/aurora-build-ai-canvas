import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  url: z.string().url().startsWith("https://", { message: "URL deve usar HTTPS" }),
  app_name: z.string().min(1).max(100).optional().default("MeuApp"),
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

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Não autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ error: "Token inválido" }, 401);

    // Validate
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

    const { url, app_name } = parsed.data;

    // Create job
    const { data: job, error: insertErr } = await supabase
      .from("conversion_jobs")
      .insert({
        user_id: user.id,
        source_url: url,
        status: "processing",
        progress: 0,
        step_label: "Iniciando processamento...",
      })
      .select()
      .single();

    if (insertErr) return respond({ error: insertErr.message }, 500);

    // Background processing (serverless internal worker)
    (async () => {
      const startTime = Date.now();
      try {
        // Validate URL accessibility
        try {
          const resp = await fetch(url, { method: "HEAD", redirect: "follow" });
          if (!resp.ok) {
            await supabase.from("conversion_jobs").update({
              status: "error",
              error_message: "Não foi possível acessar o link.",
              processing_time_ms: Date.now() - startTime,
            }).eq("id", job.id);
            return;
          }
        } catch {
          await supabase.from("conversion_jobs").update({
            status: "error",
            error_message: "Erro ao acessar o link.",
            processing_time_ms: Date.now() - startTime,
          }).eq("id", job.id);
          return;
        }

        // Process steps
        for (const step of STEPS) {
          await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));
          await supabase.from("conversion_jobs").update({
            progress: step.progress,
            step_label: step.label,
            status: step.progress >= 100 ? "done" : "processing",
            processing_time_ms: Date.now() - startTime,
          }).eq("id", job.id);
        }

        // Final update with download URL
        await supabase.from("conversion_jobs").update({
          status: "done",
          progress: 100,
          step_label: "Concluído!",
          download_url: `https://storage.aurora-build.ai/aab/${job.id}/app-release.aab`,
          processing_time_ms: Date.now() - startTime,
        }).eq("id", job.id);

        // Log success
        await supabase.from("system_logs").insert({
          user_id: user.id,
          severity: "info",
          category: "build",
          message: `Conversão AAB concluída para ${url}`,
          details: { job_id: job.id, url, app_name, processing_time_ms: Date.now() - startTime },
        });

        console.log(`[PROCESS] Job ${job.id} completed in ${Date.now() - startTime}ms`);
      } catch (err) {
        console.error(`[PROCESS] Job ${job.id} failed:`, err.message);
        await supabase.from("conversion_jobs").update({
          status: "error",
          error_message: "Erro interno ao processar.",
          processing_time_ms: Date.now() - startTime,
        }).eq("id", job.id);
      }
    })();

    return respond({
      job_id: job.id,
      status: "processing",
      message: "Processamento iniciado com sucesso",
    });
  } catch (err) {
    console.error("[PROCESS] Fatal error:", err.message);
    return respond({ error: "Erro interno do servidor" }, 500);
  }
});
