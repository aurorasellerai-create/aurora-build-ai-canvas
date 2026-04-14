import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "Aurora Build <contato@aurorabuild.com.br>";

// ─── Email Templates ───

function welcomeEmail(name: string): { subject: string; html: string } {
  return {
    subject: "🚀 Bem-vindo à Aurora Build!",
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#131729;border-radius:16px;border:1px solid #1E2340;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:32px;text-align:center;">
    <h1 style="margin:0;font-size:28px;color:#0B0F1A;font-weight:800;">Aurora Build</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#0B0F1A;opacity:0.8;">Transforme sites em apps Android com IA</p>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:40px 32px;">
    <h2 style="color:#FFD700;font-size:22px;margin:0 0 16px;">Bem-vindo(a), ${name}! 🎉</h2>
    <p style="color:#E0E0E0;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Sua conta na <strong style="color:#FFD700;">Aurora Build</strong> foi criada com sucesso. 
      Agora você tem acesso à plataforma mais avançada para criar apps Android sem código.
    </p>
    <p style="color:#E0E0E0;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Comece agora mesmo:
    </p>
    <ul style="color:#E0E0E0;font-size:14px;line-height:2;padding-left:20px;margin:0 0 32px;">
      <li>📱 <strong>Converta qualquer site</strong> em app Android</li>
      <li>🤖 <strong>Use IA</strong> para gerar ícones, splashscreens e descrições</li>
      <li>⚡ <strong>Publique na Play Store</strong> em minutos</li>
    </ul>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);border-radius:8px;padding:14px 32px;">
      <a href="https://aurorabuild.com.br/dashboard" style="color:#0B0F1A;text-decoration:none;font-weight:700;font-size:15px;">
        Acessar meu painel →
      </a>
    </td></tr>
    </table>
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 32px;border-top:1px solid #1E2340;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0;">
      Aurora Build — Crie apps Android com IA<br/>
      <a href="https://aurorabuild.com.br" style="color:#FFD700;text-decoration:none;">aurorabuild.com.br</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

function planConfirmationEmail(
  name: string,
  plan: string,
  credits: number
): { subject: string; html: string } {
  const planLabel = plan === "premium" ? "Premium" : "Pro";
  return {
    subject: `✅ Plano ${planLabel} ativado — Aurora Build`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#131729;border-radius:16px;border:1px solid #1E2340;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:32px;text-align:center;">
    <h1 style="margin:0;font-size:28px;color:#0B0F1A;font-weight:800;">Aurora Build</h1>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h2 style="color:#FFD700;font-size:22px;margin:0 0 16px;">Pagamento confirmado! ✅</h2>
    <p style="color:#E0E0E0;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Olá, <strong style="color:#fff;">${name}</strong>!
    </p>
    <p style="color:#E0E0E0;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Seu plano <strong style="color:#FFD700;">${planLabel}</strong> foi ativado com sucesso.
    </p>
    <!-- Receipt -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;border-radius:12px;padding:24px;margin:0 0 24px;">
    <tr><td>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color:#999;font-size:13px;">Plano</td>
          <td align="right" style="color:#FFD700;font-size:14px;font-weight:700;">${planLabel}</td>
        </tr>
        <tr>
          <td style="color:#999;font-size:13px;">Créditos bônus</td>
          <td align="right" style="color:#00E5FF;font-size:14px;font-weight:700;">+${credits} créditos</td>
        </tr>
        <tr>
          <td style="color:#999;font-size:13px;">Status</td>
          <td align="right" style="color:#4CAF50;font-size:14px;font-weight:700;">Ativo ✓</td>
        </tr>
      </table>
    </td></tr>
    </table>
    <p style="color:#E0E0E0;font-size:14px;line-height:1.7;margin:0 0 32px;">
      Aproveite todos os recursos do plano ${planLabel} para criar apps incríveis!
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);border-radius:8px;padding:14px 32px;">
      <a href="https://aurorabuild.com.br/dashboard" style="color:#0B0F1A;text-decoration:none;font-weight:700;font-size:15px;">
        Ir para o painel →
      </a>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #1E2340;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0;">
      Aurora Build — <a href="https://aurorabuild.com.br" style="color:#FFD700;text-decoration:none;">aurorabuild.com.br</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

function creditPurchaseEmail(
  name: string,
  creditsAmount: number,
  packageName: string
): { subject: string; html: string } {
  const packageLabels: Record<string, string> = {
    starter: "Starter (100 créditos)",
    pro: "Pro (500 créditos)",
    scale: "Scale (2.000 créditos)",
  };
  const label = packageLabels[packageName] || `${creditsAmount} créditos`;

  return {
    subject: `✅ +${creditsAmount} créditos adicionados — Aurora Build`,
    html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0B0F1A;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#131729;border-radius:16px;border:1px solid #1E2340;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#FFD700 0%,#FFA500 100%);padding:32px;text-align:center;">
    <h1 style="margin:0;font-size:28px;color:#0B0F1A;font-weight:800;">Aurora Build</h1>
  </td></tr>
  <tr><td style="padding:40px 32px;">
    <h2 style="color:#00E5FF;font-size:22px;margin:0 0 16px;">Créditos adicionados! 💎</h2>
    <p style="color:#E0E0E0;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Olá, <strong style="color:#fff;">${name}</strong>! Sua compra foi confirmada.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0B0F1A;border-radius:12px;padding:24px;margin:0 0 24px;">
    <tr><td>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="color:#999;font-size:13px;">Pacote</td>
          <td align="right" style="color:#FFD700;font-size:14px;font-weight:700;">${label}</td>
        </tr>
        <tr>
          <td style="color:#999;font-size:13px;">Créditos adicionados</td>
          <td align="right" style="color:#00E5FF;font-size:14px;font-weight:700;">+${creditsAmount}</td>
        </tr>
        <tr>
          <td style="color:#999;font-size:13px;">Status</td>
          <td align="right" style="color:#4CAF50;font-size:14px;font-weight:700;">Confirmado ✓</td>
        </tr>
      </table>
    </td></tr>
    </table>
    <p style="color:#E0E0E0;font-size:14px;line-height:1.7;margin:0 0 32px;">
      Use seus créditos para gerar ícones, splashscreens, descrições e muito mais com IA!
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td style="background:linear-gradient(135deg,#FFD700,#FFA500);border-radius:8px;padding:14px 32px;">
      <a href="https://aurorabuild.com.br/dashboard" style="color:#0B0F1A;text-decoration:none;font-weight:700;font-size:15px;">
        Usar meus créditos →
      </a>
    </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #1E2340;text-align:center;">
    <p style="color:#666;font-size:12px;margin:0;">
      Aurora Build — <a href="https://aurorabuild.com.br" style="color:#FFD700;text-decoration:none;">aurorabuild.com.br</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  };
}

// ─── Templates Registry ───

type TemplateName = "welcome" | "plan-confirmation" | "credit-purchase";

interface EmailRequest {
  templateName: TemplateName;
  recipientEmail: string;
  data?: Record<string, any>;
}

function renderTemplate(req: EmailRequest): { subject: string; html: string } {
  const name = req.data?.name || "usuário";

  switch (req.templateName) {
    case "welcome":
      return welcomeEmail(name);
    case "plan-confirmation":
      return planConfirmationEmail(name, req.data?.plan || "pro", req.data?.credits || 0);
    case "credit-purchase":
      return creditPurchaseEmail(name, req.data?.creditsAmount || 0, req.data?.packageName || "starter");
    default:
      throw new Error(`Template não encontrado: ${req.templateName}`);
  }
}

// ─── Main Handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const body: EmailRequest = await req.json();

    if (!body.templateName || !body.recipientEmail) {
      return new Response(JSON.stringify({ error: "templateName and recipientEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = renderTemplate(body);

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [body.recipientEmail],
        subject,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", JSON.stringify(result));
      throw new Error(`Resend API failed [${response.status}]: ${JSON.stringify(result)}`);
    }

    console.log(`✅ Email "${body.templateName}" sent to ${body.recipientEmail}`);

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("❌ Email error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
