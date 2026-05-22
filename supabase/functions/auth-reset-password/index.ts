import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

const corsHeaders = getCorsHeaders();

// ── In-memory IP rate limit (best-effort per isolate). Hard cap on top of DB-level limit. ──
const ipBucket = new Map<string, number[]>();
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 min
const IP_MAX = 5;

function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") || "";
  return xff.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown";
}

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (ipBucket.get(ip) || []).filter((t) => now - t < IP_WINDOW_MS);
  if (arr.length >= IP_MAX) {
    ipBucket.set(ip, arr);
    return false;
  }
  arr.push(now);
  ipBucket.set(ip, arr);
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const ip = getClientIp(req);

  // 1) Edge-level IP rate limit — fail fast before doing any work.
  if (!checkIpRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }),
      { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Retry-After": "600" } },
    );
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || email.length > 320) {
      return new Response(JSON.stringify({ error: "Email inválido" }), {
        status: 400,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 2) DB-level IP rate limit (cross-isolate). Reuses login_attempts.
    try {
      const { data: ipOk } = await adminClient.rpc("check_ip_rate_limit", { p_ip: ip });
      if (ipOk === false) {
        return new Response(
          JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }),
          { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json", "Retry-After": "900" } },
        );
      }
    } catch (e) {
      console.warn("IP rate limit check failed (continuing):", e);
    }

    // Record this attempt (failures-only bucket; counts toward IP limiter).
    try {
      await adminClient.from("login_attempts").insert({
        email: `reset:${email.toLowerCase()}`,
        ip,
        user_agent: req.headers.get("user-agent")?.slice(0, 255) || null,
        success: false,
      });
    } catch (e) {
      console.warn("Failed to record reset attempt:", e);
    }

    // Generate recovery link via admin API
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: "https://aurorabuild.com.br/reset-password",
      },
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Don't reveal if email exists or not
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get user display name
    const { data: profile } = await adminClient
      .from("profiles")
      .select("display_name")
      .eq("user_id", linkData.user.id)
      .maybeSingle();

    const name = profile?.display_name || email.split("@")[0];
    const actionLink = linkData.properties?.action_link || "";

    // Send reset email via send-email function using SERVICE ROLE (anon key bypass removed)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        templateName: "password-reset",
        recipientEmail: email,
        data: { name, resetLink: actionLink },
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Send email error:", err);
    } else {
      console.log(`📧 Password reset email sent to ${email}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("❌ Reset password error:", error);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
