import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SECURITY_RESPONSE_HEADERS } from "../_shared/safeFetch.ts";

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
    "Vary": "Origin",
  };
}

function jsonResponse(req: Request, status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      ...SECURITY_RESPONSE_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function clientFingerprint(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ua = (req.headers.get("user-agent") || "").slice(0, 80);
  return `${fwd.split(",")[0].trim() || "unknown"}|${ua}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const correlationId = crypto.randomUUID();

  try {
    // 1. Require an Authorization header.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[SECURITY] worker-health unauthenticated access blocked cid=${correlationId} fp=${clientFingerprint(req)}`);
      return jsonResponse(req, 401, { error: "Unauthorized", correlationId });
    }

    // 2. Validate JWT via Supabase claims (verifies signature + expiration).
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn(`[SECURITY] worker-health invalid JWT cid=${correlationId} fp=${clientFingerprint(req)}`);
      return jsonResponse(req, 401, { error: "Unauthorized", correlationId });
    }

    const claims = claimsData.claims as Record<string, unknown>;
    const userId = claims.sub as string | undefined;
    const exp = typeof claims.exp === "number" ? claims.exp : 0;

    // 3. Explicit expiration check (defense-in-depth — getClaims already enforces).
    if (!userId || (exp && exp * 1000 < Date.now())) {
      console.warn(`[SECURITY] worker-health expired/invalid token cid=${correlationId}`);
      return jsonResponse(req, 401, { error: "Unauthorized", correlationId });
    }

    // 4. Role authorization — admin/founder only. Deny-by-default on any error.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: isPrivileged, error: roleError } = await supabase.rpc("is_privileged", {
      _user_id: userId,
    });
    if (roleError) {
      console.error(`[SECURITY] worker-health role lookup failed cid=${correlationId}:`, roleError.message);
      return jsonResponse(req, 403, { error: "Forbidden", correlationId });
    }
    if (!isPrivileged) {
      console.warn(`[SECURITY] worker-health forbidden user=${userId} cid=${correlationId} fp=${clientFingerprint(req)}`);
      return jsonResponse(req, 403, { error: "Forbidden", correlationId });
    }

    // 5. Admin-only: gather queue stats.
    let dbStatus = "disconnected";
    let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "error"),
      ]);

      dbStatus = "connected";
      queueStats = {
        waiting: waiting.count ?? 0,
        active: active.count ?? 0,
        completed: completed.count ?? 0,
        failed: failed.count ?? 0,
      };
    } catch {
      dbStatus = "error";
    }

    return jsonResponse(req, 200, {
      status: "ok",
      mode: "serverless",
      database: dbStatus,
      worker: "internal",
      queue: queueStats,
      timestamp: new Date().toISOString(),
      version: "3.0.0",
      runtime: "edge",
      correlationId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(`[SECURITY] worker-health unexpected error cid=${correlationId}:`, message);
    return jsonResponse(req, 500, { status: "error", message: "Internal error", correlationId });
  }
});
