import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "../_shared/totp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const { code } = await req.json();
    if (!code || typeof code !== "string") return json({ error: "Código obrigatório" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row } = await admin
      .from("admin_2fa")
      .select("secret, enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row?.secret) return json({ error: "Configure o 2FA primeiro" }, 400);

    const ok = await verifyTotp(row.secret, code, 1);
    if (!ok) return json({ error: "Código inválido. Verifique o relógio do dispositivo." }, 400);

    const plainCodes = generateBackupCodes(8);
    const hashed = await Promise.all(plainCodes.map(hashBackupCode));

    await admin.from("admin_2fa").update({
      enabled: true,
      backup_codes: hashed,
      last_used_at: new Date().toISOString(),
    }).eq("user_id", user.id);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;

    await admin.rpc("log_admin_action", {
      p_action: "2fa_enable",
      p_target_type: "admin_2fa",
      p_target_id: user.id,
      p_metadata: {},
      p_ip: ip,
      p_user_agent: ua,
    });

    return json({ success: true, backup_codes: plainCodes });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
