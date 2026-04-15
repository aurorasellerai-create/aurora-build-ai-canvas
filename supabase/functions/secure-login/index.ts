import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Lovable preview/dev domains
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req?: Request) {
  const origin = req?.headers.get("Origin") || "";
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return json({ error: "Email e senha são obrigatórios" }, 400);
    }

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    if (email.length > 255 || password.length > 128) {
      return json({ error: "Dados inválidos" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Server-side rate limit check
    const { data: allowed, error: rlError } = await adminClient.rpc(
      "check_login_rate_limit",
      { p_email: email }
    );

    if (rlError || allowed === false) {
      return json(
        {
          error: "Muitas tentativas de login. Conta bloqueada temporariamente por 15 minutos.",
          locked: true,
          lockout_minutes: 15,
        },
        429
      );
    }

    // Attempt login via Supabase Auth
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } =
      await anonClient.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      // Record failed attempt
      await adminClient.rpc("record_login_attempt", {
        p_email: email,
        p_success: false,
      });

      // Check how many attempts remain
      const { data: stillAllowed } = await adminClient.rpc(
        "check_login_rate_limit",
        { p_email: email }
      );

      // Count recent failures for remaining attempts info
      const { count } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .eq("success", false)
        .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());

      const remaining = Math.max(0, 5 - (count || 0));

      return json(
        {
          error: authError?.message || "Credenciais inválidas",
          remaining_attempts: remaining,
          locked: stillAllowed === false,
        },
        401
      );
    }

    // Record successful login (clears failed attempts)
    await adminClient.rpc("record_login_attempt", {
      p_email: email,
      p_success: true,
    });

    return json({
      session: authData.session,
      user: authData.user,
    });
  } catch (err) {
    console.error("secure-login error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
