import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  url: z.string().url().startsWith("https://", { message: "URL deve usar HTTPS" }),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    if (authError || !user) return respond({ success: false, error: "Token inválido", step: "auth" });

    // Validate body
    let body: unknown;
    try {
      body = await req.json();
      console.log("[CONVERT] Input received:", JSON.stringify(body));
    } catch {
      return respond({ success: false, error: "Body JSON inválido", step: "input_parsing" });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return respond({ success: false, error: "Dados inválidos", step: "input_validation", details: parsed.error.flatten().fieldErrors });
    }

    const { url } = parsed.data;
    console.log(`[CONVERT] Creating job for ${url}`);

    // Create job record
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

    if (insertErr) {
      console.error("[CONVERT] Failed to create job:", insertErr.message);
      return respond({ success: false, error: "Falha ao criar job", step: "job_creation", details: insertErr.message });
    }

    console.log(`[CONVERT] Job created: ${job.id}`);

    // Invoke process-app as a SEPARATE function (won't be killed when this function returns)
    const processUrl = `${supabaseUrl}/functions/v1/process-app`;
    console.log(`[CONVERT] Triggering process-app for job ${job.id}`);
    fetch(processUrl, {
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
      }
    }).catch(async (err) => {
      console.error("Failed to invoke process-app:", err.message);
      await supabase.from("conversion_jobs").update({
        status: "error",
        step_label: "Erro na conversão",
        error_message: "Falha ao iniciar o processamento interno.",
      }).eq("id", job.id);
    });

    return respond({ success: true, job_id: job.id, message: "Processo iniciado" });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[CONVERT] Fatal error:", err);
    return respond({ success: false, error: "Erro interno do servidor", step: "global_catch", details: errorMessage });
  }
});
