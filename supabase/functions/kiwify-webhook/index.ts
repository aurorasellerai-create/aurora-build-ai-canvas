import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Helper to send transactional emails via send-email edge function
async function sendTransactionalEmail(
  supabaseUrl: string,
  supabaseAnonKey: string,
  templateName: string,
  recipientEmail: string,
  data?: Record<string, any>
) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ templateName, recipientEmail, data }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error(`⚠️ Email "${templateName}" failed for ${recipientEmail}: ${err}`);
    } else {
      console.log(`📧 Email "${templateName}" queued for ${recipientEmail}`);
    }
  } catch (e) {
    console.error(`⚠️ Email send error:`, e);
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit packages mapping
const CREDIT_PACKAGES: Record<string, number> = {
  starter: 100,
  pro: 500,
  scale: 2000,
};

// Plan credit bonuses on upgrade
const PLAN_CREDITS: Record<string, number> = {
  pro: 50,
  premium: 500,
};

// Simple in-memory rate limiter (per isolate lifetime)
const recentRequests = new Map<string, number>();
const RATE_LIMIT_MS = 5000;

function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

function parseWebhookBody(body: any) {
  const orderStatus = body?.order_status || body?.subscription_status || body?.status;
  const customerEmail = body?.Customer?.email || body?.customer?.email || body?.email;
  const customerName = body?.Customer?.full_name || body?.customer?.name || body?.name || "";
  const transactionId = body?.order_id || body?.transaction_id || body?.id;
  const amountRaw = body?.Commissions?.charge_amount || body?.commissions?.charge_amount ||
    body?.product?.price || body?.amount || "0";
  const amount = Math.round(parseFloat(String(amountRaw).replace(",", ".")) * 100);
  const productName = (body?.Product?.name || body?.product?.name || "").toLowerCase();

  return { orderStatus, customerEmail, customerName, transactionId, amount, productName };
}

function classifyStatus(orderStatus: string) {
  const isApproved = ["paid", "approved", "completed", "active"].includes(orderStatus);
  const isRefunded = ["refunded", "chargedback", "chargeback"].includes(orderStatus);
  const isCancelled = ["cancelled", "canceled", "expired", "inactive", "overdue"].includes(orderStatus);
  const isRenewal = ["renewed", "subscription_renewed"].includes(orderStatus);
  const isFailed = ["failed", "refused", "declined", "payment_failed"].includes(orderStatus);

  let paymentStatus: "approved" | "refunded" | "cancelled" | "pending" = "pending";
  if (isApproved || isRenewal) paymentStatus = "approved";
  else if (isRefunded) paymentStatus = "refunded";
  else if (isCancelled || isFailed) paymentStatus = "cancelled";

  return { isApproved, isRefunded, isCancelled, isRenewal, isFailed, paymentStatus };
}

function isCreditProduct(productName: string) {
  return productName.includes("crédito") || productName.includes("credito") ||
    productName.includes("credit") || productName.includes("starter") ||
    productName.includes("scale");
}

function detectPlan(productName: string): "pro" | "premium" {
  if (productName.includes("premium") || productName.includes("elite")) return "premium";
  return "pro";
}

function detectCreditPackage(productName: string): { packageName: string; creditsAmount: number } {
  if (productName.includes("scale") || productName.includes("2000")) return { packageName: "scale", creditsAmount: 2000 };
  if (productName.includes("pro") || productName.includes("500")) return { packageName: "pro", creditsAmount: 500 };
  return { packageName: "starter", creditsAmount: 100 };
}

async function findOrCreateUser(adminClient: any, email: string, name: string) {
  // Try to find existing user
  const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  let user = users?.find((u: any) => u.email === email);

  if (!user) {
    // Auto-create user with a random password (they can reset later)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: name || email.split("@")[0] },
    });

    if (createError) {
      throw new Error(`Failed to create user for ${email}: ${createError.message}`);
    }
    user = newUser.user;
    console.log(`✅ Auto-created user for ${email}`);

    // Send welcome email
    await sendTransactionalEmail(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      "welcome",
      email,
      { name: name || email.split("@")[0] }
    );
  }

  return user;
}

async function handleCreditPurchase(
  adminClient: any, user: any, transactionId: string,
  productName: string, amount: number,
  status: ReturnType<typeof classifyStatus>,
  customerEmail: string
) {
  // Deduplication
  const { data: existing } = await adminClient
    .from("credit_purchases")
    .select("id")
    .eq("provider_transaction_id", transactionId)
    .maybeSingle();

  if (existing) {
    console.warn(`⚠️ Duplicate credit purchase: ${transactionId}`);
    return { duplicate: true };
  }

  const { packageName, creditsAmount } = detectCreditPackage(productName);

  await adminClient.from("credit_purchases").insert({
    user_id: user.id,
    package_name: packageName,
    credits_amount: creditsAmount,
    amount,
    provider: "kiwify",
    provider_transaction_id: transactionId,
    status: status.paymentStatus,
  });

  if (status.isApproved) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    await adminClient.from("profiles").update({
      credits_balance: (profile?.credits_balance || 0) + creditsAmount,
    }).eq("user_id", user.id);

    console.log(`✅ Added ${creditsAmount} credits to ${customerEmail}`);

    // Send credit purchase confirmation email
    await sendTransactionalEmail(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      "credit-purchase",
      customerEmail,
      { name: user.user_metadata?.display_name || customerEmail.split("@")[0], creditsAmount, packageName }
    );
  } else if (status.isRefunded) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    await adminClient.from("profiles").update({
      credits_balance: Math.max(0, (profile?.credits_balance || 0) - creditsAmount),
    }).eq("user_id", user.id);

    console.log(`⚠️ Removed ${creditsAmount} credits from ${customerEmail} (refund)`);
  }

  return { duplicate: false };
}

async function handlePlanChange(
  adminClient: any, user: any, transactionId: string,
  productName: string, amount: number,
  status: ReturnType<typeof classifyStatus>,
  customerEmail: string
) {
  // Deduplication
  const { data: existing } = await adminClient
    .from("payments")
    .select("id")
    .eq("provider_transaction_id", transactionId)
    .maybeSingle();

  if (existing) {
    // For renewals, update the existing payment record
    if (status.isRenewal) {
      await adminClient.from("payments").update({
        status: "approved",
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("provider_transaction_id", transactionId);

      // Keep plan active
      await adminClient.from("profiles").update({
        subscription_status: "active",
        payment_date: new Date().toISOString(),
        status: "ativo",
      }).eq("user_id", user.id);

      console.log(`🔄 Renewal processed for ${customerEmail}`);
      return { duplicate: false };
    }

    console.warn(`⚠️ Duplicate plan payment: ${transactionId}`);
    return { duplicate: true };
  }

  const plan = detectPlan(productName);

  await adminClient.from("payments").insert({
    user_id: user.id,
    plan,
    amount,
    provider: "kiwify",
    provider_transaction_id: transactionId,
    status: status.paymentStatus,
    paid_at: status.isApproved || status.isRenewal ? new Date().toISOString() : null,
  });

  if (status.isApproved || status.isRenewal) {
    const planCredits = PLAN_CREDITS[plan] || 0;
    const { data: profile } = await adminClient
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .single();

    await adminClient.from("profiles").update({
      plan,
      subscription_status: "active",
      payment_date: new Date().toISOString(),
      credits_balance: (profile?.credits_balance || 0) + planCredits,
      tipo_usuario: "cliente",
      status: "ativo",
    }).eq("user_id", user.id);

    console.log(`✅ ${customerEmail} upgraded to ${plan} (+${planCredits} credits)`);

    // Send plan confirmation email
    await sendTransactionalEmail(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      "plan-confirmation",
      customerEmail,
      { name: user.user_metadata?.display_name || customerEmail.split("@")[0], plan, credits: planCredits }
    );
  } else if (status.isRefunded) {
    await adminClient.from("profiles").update({
      plan: "free",
      subscription_status: "cancelled",
      status: "ativo",
    }).eq("user_id", user.id);
    console.log(`⚠️ ${customerEmail} downgraded to free (refund)`);
  } else if (status.isCancelled || status.isFailed) {
    await adminClient.from("profiles").update({
      plan: "free",
      subscription_status: "cancelled",
      status: "ativo",
    }).eq("user_id", user.id);
    console.log(`🚫 ${customerEmail} downgraded to free (cancelled/failed)`);
  }

  return { duplicate: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Kiwify webhook received:", JSON.stringify(body));

    // Validate webhook token
    const webhookToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
    if (webhookToken) {
      const signature = req.headers.get("x-kiwify-signature") ||
        req.headers.get("signature") ||
        body?.signature;
      if (signature !== webhookToken) {
        console.error("❌ Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { orderStatus, customerEmail, customerName, transactionId, amount, productName } = parseWebhookBody(body);

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "Customer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transactionId) {
      return new Response(JSON.stringify({ error: "Transaction ID not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    const now = Date.now();
    const lastSeen = recentRequests.get(transactionId);
    if (lastSeen && now - lastSeen < RATE_LIMIT_MS) {
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recentRequests.set(transactionId, now);
    for (const [key, ts] of recentRequests) {
      if (now - ts > 60000) recentRequests.delete(key);
    }

    const adminClient = getAdminClient();
    const status = classifyStatus(orderStatus);

    // Find or auto-create user
    const user = await findOrCreateUser(adminClient, customerEmail, customerName);

    let result;
    if (isCreditProduct(productName)) {
      result = await handleCreditPurchase(adminClient, user, transactionId, productName, amount, status, customerEmail);
    } else {
      result = await handlePlanChange(adminClient, user, transactionId, productName, amount, status, customerEmail);
    }

    // Log event
    await adminClient.from("system_logs").insert({
      user_id: user.id,
      severity: "info",
      category: "webhook",
      message: `Webhook: ${orderStatus} for ${productName || "plan"} (${customerEmail})`,
      details: {
        transactionId, orderStatus, productName, amount,
        paymentStatus: status.paymentStatus,
        order_id: transactionId,
        plan: isCreditProduct(productName) ? undefined : detectPlan(productName),
        email: customerEmail,
        product: productName,
        status: status.paymentStatus,
        credits_added: isCreditProduct(productName) ? detectCreditPackage(productName).creditsAmount : (PLAN_CREDITS[detectPlan(productName)] || 0),
      },
    }).catch(() => {});

    return new Response(JSON.stringify({ success: true, status: status.paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
