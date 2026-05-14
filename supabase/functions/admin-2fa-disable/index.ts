import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyTotp, hashBackupCode } from "../_shared/totp.ts";

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
    if (!code) return json({ error: "Confirme com código TOTP ou backup code" }, 400);

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
      .from("admin_2fa").select("secret, backup_codes, enabled")
      .eq("user_id", user.id).maybeSingle();
    if (!row?.enabled) return json({ error: "2FA não está ativo" }, 400);

    let valid = await verifyTotp(row.secret, code, 1);
    if (!valid) {
      const hashed = await hashBackupCode(code);
      const codes: string[] = (row.backup_codes as string[]) ?? [];
      valid = codes.includes(hashed);
    }
    if (!valid) return json({ error: "Código inválido" }, 400);

    await admin.from("admin_2fa").delete().eq("user_id", user.id);

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const ua = req.headers.get("user-agent") || null;
    await admin.rpc("log_admin_action", {
      p_action: "2fa_disable", p_target_type: "admin_2fa", p_target_id: user.id,
      p_metadata: {}, p_ip: ip, p_user_agent: ua,
    });

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
