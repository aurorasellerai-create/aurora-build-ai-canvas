import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        console.error("❌ Invalid webhook signature — possible unauthorized attempt");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const orderStatus = body?.order_status || body?.subscription_status || body?.status;
    const customerEmail = body?.Customer?.email || body?.customer?.email || body?.email;
    const transactionId = body?.order_id || body?.transaction_id || body?.id;
    const amountRaw = body?.Commissions?.charge_amount || body?.commissions?.charge_amount || 
                      body?.product?.price || body?.amount || "0";
    const amount = Math.round(parseFloat(String(amountRaw).replace(",", ".")) * 100);

    const productName = (body?.Product?.name || body?.product?.name || "").toLowerCase();

    if (!customerEmail) {
      console.error("❌ Missing customer email in webhook payload");
      return new Response(JSON.stringify({ error: "Customer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!transactionId) {
      console.error("❌ Missing transaction ID in webhook payload");
      return new Response(JSON.stringify({ error: "Transaction ID not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: reject rapid duplicate calls with same transactionId
    const now = Date.now();
    const lastSeen = recentRequests.get(transactionId);
    if (lastSeen && now - lastSeen < RATE_LIMIT_MS) {
      console.warn(`⚠️ Rate limited: duplicate request for ${transactionId} within ${RATE_LIMIT_MS}ms`);
      return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recentRequests.set(transactionId, now);
    // Cleanup old entries
    for (const [key, ts] of recentRequests) {
      if (now - ts > 60000) recentRequests.delete(key);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find user by email
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const user = users?.find((u) => u.email === customerEmail);

    if (!user) {
      console.error(`❌ User not found for email: ${customerEmail}`);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isApproved = orderStatus === "paid" || orderStatus === "approved" || 
                       orderStatus === "completed" || orderStatus === "active";
    const isRefunded = orderStatus === "refunded" || orderStatus === "chargedback" || 
                       orderStatus === "chargeback";

    let paymentStatus: "approved" | "refunded" | "cancelled" | "pending" = "pending";
    if (isApproved) paymentStatus = "approved";
    else if (isRefunded) paymentStatus = "refunded";

    // Detect if this is a credit package purchase or a plan upgrade
    const isCreditPurchase = productName.includes("crédito") || productName.includes("credito") || 
                             productName.includes("credit") || productName.includes("starter") || 
                             productName.includes("scale");
    
    if (isCreditPurchase) {
      // --- CREDIT PACKAGE PURCHASE ---
      // Deduplication: check if this transaction already exists
      const { data: existingPurchase } = await adminClient
        .from("credit_purchases")
        .select("id")
        .eq("provider_transaction_id", transactionId)
        .maybeSingle();

      if (existingPurchase) {
        console.warn(`⚠️ Duplicate credit purchase detected: ${transactionId} — skipping`);
        return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let packageName = "starter";
      let creditsAmount = 100;
      
      if (productName.includes("scale") || productName.includes("2000")) {
        packageName = "scale";
        creditsAmount = 2000;
      } else if (productName.includes("pro") || productName.includes("500")) {
        packageName = "pro";
        creditsAmount = 500;
      }

      // Record credit purchase
      await adminClient.from("credit_purchases").insert({
        user_id: user.id,
        package_name: packageName,
        credits_amount: creditsAmount,
        amount,
        provider: "kiwify",
        provider_transaction_id: transactionId,
        status: paymentStatus,
      });

      if (isApproved) {
        const { data: profile } = await adminClient
          .from("profiles")
          .select("credits_balance")
          .eq("user_id", user.id)
          .single();

        await adminClient.from("profiles").update({
          credits_balance: (profile?.credits_balance || 0) + creditsAmount,
        }).eq("user_id", user.id);

        console.log(`✅ Added ${creditsAmount} credits to ${customerEmail}`);
      } else if (isRefunded) {
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
    } else {
      // --- PLAN UPGRADE ---
      // Deduplication: check if this transaction already exists
      const { data: existingPayment } = await adminClient
        .from("payments")
        .select("id")
        .eq("provider_transaction_id", transactionId)
        .maybeSingle();

      if (existingPayment) {
        console.warn(`⚠️ Duplicate plan payment detected: ${transactionId} — skipping`);
        return new Response(JSON.stringify({ success: true, message: "Already processed" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let plan: "pro" | "premium" = "pro";
      if (productName.includes("premium") || productName.includes("elite")) {
        plan = "premium";
      }

      // Record payment
      await adminClient.from("payments").insert({
        user_id: user.id,
        plan,
        amount,
        provider: "kiwify",
        provider_transaction_id: transactionId,
        status: paymentStatus,
        paid_at: isApproved ? new Date().toISOString() : null,
      });

      if (isApproved) {
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

        console.log(`✅ User ${customerEmail} upgraded to ${plan} (+${planCredits} credits)`);
      } else if (isRefunded) {
        await adminClient.from("profiles").update({
          plan: "free",
          subscription_status: "cancelled",
        }).eq("user_id", user.id);
        console.log(`⚠️ User ${customerEmail} downgraded to free (refund)`);
      }
    }

    return new Response(JSON.stringify({ success: true, status: paymentStatus }), {
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
