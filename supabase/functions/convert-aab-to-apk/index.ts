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

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500MB
const MIN_FILE_BYTES = 256;

// Accepts new direct-to-storage flow (storagePath) OR legacy small base64 payloads
const BodySchema = z.object({
  fileName: z.string().trim().min(3).max(180).refine((name) => name.toLowerCase().endsWith(".aab"), "Envie um arquivo .aab"),
  storagePath: z.string().min(5).optional(),
  fileSize: z.number().int().positive().max(MAX_FILE_BYTES).optional(),
  fileBase64: z.string().min(100).optional(),
}).refine((d) => d.storagePath || d.fileBase64, { message: "storagePath ou fileBase64 obrigatório" });

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

    const { fileName, storagePath, fileBase64, fileSize } = parsed.data;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-");

    // Create job first (we'll bind the storage path after validation)
    const { data: job, error: insertErr } = await supabase.from("conversion_jobs").insert({
      user_id: user.id,
      source_url: `aab-upload://${safeName}`,
      status: "queued",
      progress: 0,
      step_label: "AAB recebido. Worker na fila...",
      build_stage: "queued",
      started_at: new Date().toISOString(),
    }).select().single();
    if (insertErr || !job) return respond({ success: false, error: "Falha ao criar conversão." });

    let finalPath: string;

    if (storagePath) {
      // ────── NEW FLOW: direct-to-storage (large files) ──────
      // Ownership: path MUST start with user.id
      if (!storagePath.startsWith(`${user.id}/`)) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: "Caminho de upload inválido.", finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: "Caminho inválido." });
      }

      // Validate file exists + size + magic bytes via signed range read (streamed, memory-safe)
      const { data: probeSigned } = await supabase.storage.from("aab-files").createSignedUrl(storagePath, 120);
      if (!probeSigned?.signedUrl) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: "Arquivo enviado não encontrado.", finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: "Arquivo não encontrado no storage." });
      }
      const head = await fetch(probeSigned.signedUrl, { method: "GET", headers: { Range: "bytes=0-15" } });
      if (!head.ok && head.status !== 206) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: "Falha ao validar arquivo.", finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: "Falha ao validar arquivo no storage." });
      }
      const magic = new Uint8Array(await head.arrayBuffer());
      if (!(magic[0] === 0x50 && magic[1] === 0x4b && magic[2] === 0x03 && magic[3] === 0x04)) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: "Arquivo inválido: não é um AAB/ZIP.", finished_at: new Date().toISOString() }).eq("id", job.id);
        await supabase.storage.from("aab-files").remove([storagePath]).catch(() => {});
        return respond({ success: false, error: "Arquivo inválido: não é um AAB/ZIP." });
      }
      if (fileSize && (fileSize < MIN_FILE_BYTES || fileSize > MAX_FILE_BYTES)) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: `Tamanho fora do limite (${MIN_FILE_BYTES}B–${MAX_FILE_BYTES}B).`, finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: "Tamanho do arquivo fora do limite." });
      }

      // Move pending upload to final path {user_id}/{job_id}/{file}
      finalPath = `${user.id}/${job.id}/${safeName}`;
      const { error: moveErr } = await supabase.storage.from("aab-files").move(storagePath, finalPath);
      if (moveErr) {
        // Fall back to original path (still owner-prefixed, valid for RLS)
        finalPath = storagePath;
        console.warn("[STORAGE] move failed, using original path", moveErr.message);
      }
      console.info("[UPLOAD] Large upload bound to job", { jobId: job.id, sizeMB: fileSize ? (fileSize / 1024 / 1024).toFixed(1) : "?" });
    } else {
      // ────── LEGACY FLOW: small base64 (kept for backward compatibility) ──────
      const cleanBase64 = fileBase64!.includes(",") ? fileBase64!.split(",").pop()! : fileBase64!;
      const binary = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));
      if (binary.byteLength > 20 * 1024 * 1024) {
        await supabase.from("conversion_jobs").update({ status: "failed", error_message: "Arquivos > 20MB devem usar upload direto.", finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: "Use o upload direto para arquivos grandes." });
      }
      if (binary.byteLength < MIN_FILE_BYTES) return respond({ success: false, error: "Arquivo muito pequeno." });
      if (!(binary[0] === 0x50 && binary[1] === 0x4b && binary[2] === 0x03 && binary[3] === 0x04)) {
        return respond({ success: false, error: "Arquivo inválido: não é um AAB/ZIP." });
      }
      finalPath = `${user.id}/${job.id}/${safeName}`;
      const { error: uploadError } = await supabase.storage.from("aab-files").upload(finalPath, binary, { contentType: "application/octet-stream", upsert: true });
      if (uploadError) {
        await supabase.from("conversion_jobs").update({ status: "failed", step_label: "Falha no upload", error_message: `Falha ao enviar AAB: ${uploadError.message}`, finished_at: new Date().toISOString() }).eq("id", job.id);
        return respond({ success: false, error: `Falha ao enviar AAB: ${uploadError.message}` });
      }
    }

    // Signed URL for the worker (60-min TTL accommodates large downloads)
    const { data: signed, error: signErr } = await supabase.storage.from("aab-files").createSignedUrl(finalPath, 60 * 60);
    if (signErr || !signed?.signedUrl) {
      await supabase.from("conversion_jobs").update({ status: "failed", step_label: "Erro na conversão", error_message: "Falha ao assinar URL de entrada.", finished_at: new Date().toISOString() }).eq("id", job.id);
      return respond({ success: false, error: "Falha ao preparar arquivo para conversão." });
    }

    const dispatchWorker = fetch(`${workerUrl.replace(/\/$/, "")}/webhook/aab-to-apk`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": workerSecret },
      body: JSON.stringify({ job_id: job.id, aab_url: signed.signedUrl, user_id: user.id }),
    }).then(async (response) => {
      if (!response.ok) {
        const payload = await response.text();
        await supabase.from("conversion_jobs").update({ status: "failed", step_label: "Erro na conversão", error_message: `Bundletool worker retornou HTTP ${response.status}.`, finished_at: new Date().toISOString(), stderr_log: payload, last_log: payload.slice(-500) }).eq("id", job.id);
      }
    }).catch(async (err) => {
      const message = err instanceof Error ? err.message : "bundletool worker dispatch failed";
      await supabase.from("conversion_jobs").update({ status: "failed", step_label: "Erro na conversão", error_message: "Falha ao iniciar bundletool.", finished_at: new Date().toISOString(), stderr_log: message, last_log: message }).eq("id", job.id);
    });
    EdgeRuntime.waitUntil(dispatchWorker);

    return respond({ success: true, job_id: job.id, message: "Conversão AAB para APK iniciada com bundletool." });
  } catch (error) {
    return respond({ success: false, error: error instanceof Error ? error.message : "Erro interno." });
  }
});
