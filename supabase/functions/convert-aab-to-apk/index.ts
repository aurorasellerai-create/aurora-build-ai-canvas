import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://esm.sh/zod@3.23.8";

const ALLOWED_ORIGINS = ["https://aurorabuild.com.br", "https://www.aurorabuild.com.br", "https://aurora-build-ai-canvas.lovable.app"];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

const BodySchema = z.object({
  fileName: z.string().trim().min(5).max(180).refine((name) => name.toLowerCase().endsWith(".aab"), "Envie um arquivo .aab"),
  fileBase64: z.string().min(100),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  const respond = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const workerUrl = Deno.env.get("WORKER_URL");
    const workerSecret = Deno.env.get("WORKER_SECRET");
    if (!supabaseUrl || !serviceKey || !workerUrl || !workerSecret) return respond({ success: false, error: "Configuração interna indisponível." });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ success: false, error: "Não autorizado" });

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ success: false, error: "Token inválido" });

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return respond({ success: false, error: "Dados inválidos", details: parsed.error.flatten().fieldErrors });

    const { fileName, fileBase64 } = parsed.data;
    const cleanBase64 = fileBase64.includes(",") ? fileBase64.split(",").pop()! : fileBase64;
    const binary = Uint8Array.from(atob(cleanBase64), (char) => char.charCodeAt(0));
    if (binary.byteLength > 20 * 1024 * 1024) return respond({ success: false, error: "Arquivo acima do limite de 20MB." });

    const { data: job, error: insertErr } = await supabase.from("conversion_jobs").insert({
      user_id: user.id,
      source_url: `aab-upload://${fileName}`,
      status: "processing",
      progress: 0,
      step_label: "Recebendo AAB assinado...",
    }).select().single();
    if (insertErr || !job) return respond({ success: false, error: "Falha ao criar conversão." });

    const inputPath = `aab-input/${job.id}/${fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("aab-files").upload(inputPath, binary, { contentType: "application/octet-stream", upsert: true });
    if (uploadError) return respond({ success: false, error: `Falha ao enviar AAB: ${uploadError.message}` });

    const { data: publicUrl } = supabase.storage.from("aab-files").getPublicUrl(inputPath);
    fetch(`${workerUrl.replace(/\/$/, "")}/webhook/aab-to-apk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ job_id: job.id, aab_url: publicUrl.publicUrl, user_id: user.id }),
    }).catch(async () => {
      await supabase.from("conversion_jobs").update({ status: "error", step_label: "Erro na conversão", error_message: "Falha ao iniciar bundletool." }).eq("id", job.id);
    });

    return respond({ success: true, job_id: job.id, message: "Conversão AAB para APK iniciada com bundletool." });
  } catch (error) {
    return respond({ success: false, error: error instanceof Error ? error.message : "Erro interno." });
  }
});