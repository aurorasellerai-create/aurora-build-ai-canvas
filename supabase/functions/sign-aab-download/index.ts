import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const TTL_SECONDS = 45 * 60; // 45 min

// Try to extract the storage object path for the `aab-files` bucket from a stored URL.
function extractAabPath(stored: string | null): string | null {
  if (!stored) return null;
  // Accept either raw path, public, or signed URL formats
  const markers = [
    "/storage/v1/object/public/aab-files/",
    "/storage/v1/object/sign/aab-files/",
    "/storage/v1/object/aab-files/",
  ];
  for (const m of markers) {
    const i = stored.indexOf(m);
    if (i !== -1) {
      const tail = stored.slice(i + m.length);
      return tail.split("?")[0];
    }
  }
  // Already a bare path?
  if (!stored.startsWith("http")) return stored.replace(/^\/+/, "");
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(req) });

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return respond({ success: false, error: "Configuração indisponível." });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ success: false, error: "Não autorizado" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ success: false, error: "Token inválido" }, 401);

    const body = await req.json().catch(() => null);
    const jobId = body?.job_id;
    if (!jobId || typeof jobId !== "string") {
      return respond({ success: false, error: "job_id obrigatório" }, 400);
    }

    // Lookup job and validate ownership (admin/founder bypass via service-role)
    const { data: job, error: jobErr } = await supabase
      .from("conversion_jobs")
      .select("id, user_id, download_url, status")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) return respond({ success: false, error: "Conversão não encontrada." }, 404);

    const { data: privileged } = await supabase.rpc("is_privileged", { _user_id: user.id });
    if (job.user_id !== user.id && !privileged) {
      return respond({ success: false, error: "Acesso negado." }, 403);
    }

    if (job.status !== "done") return respond({ success: false, error: "Arquivo ainda não disponível." }, 409);

    const path = extractAabPath(job.download_url);
    if (!path) return respond({ success: false, error: "Arquivo indisponível." }, 404);

    const { data: signed, error: signErr } = await supabase.storage
      .from("aab-files")
      .createSignedUrl(path, TTL_SECONDS);

    if (signErr || !signed?.signedUrl) {
      return respond({ success: false, error: "Falha ao gerar URL assinada." }, 500);
    }

    return respond({ success: true, url: signed.signedUrl, expires_in: TTL_SECONDS });
  } catch (e) {
    return respond({ success: false, error: e instanceof Error ? e.message : "Erro interno." }, 500);
  }
});
