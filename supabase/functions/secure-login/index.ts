import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyTotp, hashBackupCode } from "../_shared/totp.ts";

const ALLOWED_ORIGINS = [
  "https://aurorabuild.com.br",
  "https://www.aurorabuild.com.br",
  "https://aurora-build-ai-canvas.lovable.app",
];

function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
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
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  const corsHeaders = getCorsHeaders(req);
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) return json({ error: "Email e senha são obrigatórios" }, 400);

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);
    const otpCode = body.otp_code ? String(body.otp_code).trim() : null;
    if (email.length > 255 || password.length > 128) return json({ error: "Dados inválidos" }, 400);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    const country = req.headers.get("cf-ipcountry") || null;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Rate limits
    const { data: emailAllowed } = await adminClient.rpc("check_login_rate_limit", { p_email: email });
    if (emailAllowed === false) {
      return json({ error: "Muitas tentativas. Conta bloqueada por 15 minutos.", locked: true, lockout_minutes: 15 }, 429);
    }
    if (ip) {
      const { data: ipAllowed } = await adminClient.rpc("check_ip_rate_limit", { p_ip: ip });
      if (ipAllowed === false) {
        return json({ error: "Muitas tentativas deste IP. Aguarde 15 minutos.", locked: true, lockout_minutes: 15 }, 429);
      }
    }

    // Login
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      await adminClient.from("login_attempts").insert({ email, success: false, ip, user_agent: ua });
      const { count } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email).eq("success", false)
        .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
      const remaining = Math.max(0, 5 - (count || 0));
      return json({ error: authError?.message || "Credenciais inválidas", remaining_attempts: remaining, locked: remaining === 0 }, 401);
    }

    const userId = authData.user!.id;

    // Verifica role admin/founder
    const [{ data: isAdmin }, { data: isFounder }] = await Promise.all([
      adminClient.rpc("has_role", { _user_id: userId, _role: "admin" }),
      adminClient.rpc("has_role", { _user_id: userId, _role: "founder" }),
    ]);
    const isPrivileged = !!isAdmin || !!isFounder;

    // 2FA enforcement
    if (isPrivileged) {
      const { data: tfa } = await adminClient
        .from("admin_2fa")
        .select("secret, enabled, backup_codes")
        .eq("user_id", userId)
        .maybeSingle();

      if (tfa?.enabled) {
        if (!otpCode) {
          // Não grava sucesso ainda — ainda falta o segundo fator
          await anonClient.auth.signOut();
          return json({ requires_2fa: true });
        }
        let valid = await verifyTotp(tfa.secret, otpCode, 1);
        let usedBackup = false;
        if (!valid) {
          const hashed = await hashBackupCode(otpCode);
          const codes: string[] = (tfa.backup_codes as string[]) ?? [];
          if (codes.includes(hashed)) {
            valid = true;
            usedBackup = true;
            const remaining = codes.filter(c => c !== hashed);
            await adminClient.from("admin_2fa").update({ backup_codes: remaining, last_used_at: new Date().toISOString() }).eq("user_id", userId);
          }
        } else {
          await adminClient.from("admin_2fa").update({ last_used_at: new Date().toISOString() }).eq("user_id", userId);
        }

        if (!valid) {
          await anonClient.auth.signOut();
          await adminClient.from("login_attempts").insert({ email, success: false, ip, user_agent: ua });
          await adminClient.from("security_alerts").insert({
            admin_id: userId, kind: "2fa_failed", severity: "warn",
            ip, user_agent: ua, details: { country },
          });
          return json({ error: "Código 2FA inválido", requires_2fa: true }, 401);
        }
        if (usedBackup) {
          await adminClient.from("security_alerts").insert({
            admin_id: userId, kind: "2fa_failed", severity: "info",
            ip, user_agent: ua, details: { used_backup_code: true, country },
          });
        }
      }
    }

    // Sucesso confirmado
    await adminClient.from("login_attempts").insert({ email, success: true, ip, user_agent: ua });
    await adminClient.from("login_attempts").delete().eq("email", email).eq("success", false);

    if (isPrivileged) {
      // Audit log
      await adminClient.from("admin_audit_log").insert({
        admin_id: userId, action: "login", target_type: null, target_id: null,
        ip, user_agent: ua, metadata: { country },
      });

      // Detecta IP novo
      if (ip) {
        const { data: known } = await adminClient.rpc("is_known_admin_ip", { p_admin_id: userId, p_ip: ip });
        if (!known) {
          await adminClient.from("security_alerts").insert({
            admin_id: userId, kind: "new_ip", severity: "warn",
            ip, user_agent: ua, details: { country, email },
          });
        }
      }

      // Brute force que precedeu o sucesso
      const { count: recentFails } = await adminClient
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", email).eq("success", false)
        .gte("attempted_at", new Date(Date.now() - 15 * 60 * 1000).toISOString());
      if ((recentFails ?? 0) >= 3) {
        await adminClient.from("security_alerts").insert({
          admin_id: userId, kind: "brute_force", severity: "critical",
          ip, user_agent: ua, details: { failed_attempts: recentFails, country },
        });
      }
    }

    return json({ session: authData.session, user: authData.user });
  } catch (err) {
    console.error("secure-login error:", err);
    return json({ error: "Erro interno do servidor" }, 500);
  }
});
