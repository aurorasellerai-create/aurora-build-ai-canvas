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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    } catch {
      return respond({ success: false, error: "Body JSON inválido", step: "input_parsing" });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return respond({ success: false, error: "Dados inválidos", step: "input_validation", details: parsed.error.flatten().fieldErrors });
    }

    const { url } = parsed.data;

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

    if (insertErr) return respond({ success: false, error: "Falha ao criar job", step: "job_creation", details: insertErr.message });

    // Invoke process-app as a SEPARATE function (won't be killed when this function returns)
    const processUrl = `${supabaseUrl}/functions/v1/process-app`;
    fetch(processUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ job_id: job.id, url }),
    }).catch((err) => {
      console.error("Failed to invoke process-app:", err.message);
    });

    return respond({ success: true, job_id: job.id, message: "Processo iniciado" });
  } catch (err) {
    console.error("[CONVERT] Fatal error:", err.message);
    return respond({ success: false, error: "Erro interno do servidor", step: "global_catch" });
  }
});
