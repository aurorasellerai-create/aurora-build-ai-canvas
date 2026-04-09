import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BodySchema = z.object({
  url: z.string().url().startsWith("https://", { message: "URL deve usar HTTPS" }),
});

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

    // Validate body
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

    if (insertErr) return respond({ error: insertErr.message }, 500);

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

    return respond({ job_id: job.id });
  } catch (err) {
    console.error("[CONVERT] Fatal error:", err.message);
    return respond({ error: "Erro interno do servidor" }, 500);
  }
});
