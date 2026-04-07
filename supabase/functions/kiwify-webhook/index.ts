import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Validate webhook token if configured
    const webhookToken = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
    if (webhookToken) {
      const signature = req.headers.get("x-kiwify-signature") || 
                        req.headers.get("signature") ||
                        body?.signature;
      if (signature !== webhookToken) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Kiwify sends different event types
    const orderStatus = body?.order_status || body?.subscription_status || body?.status;
    const customerEmail = body?.Customer?.email || body?.customer?.email || body?.email;
    const transactionId = body?.order_id || body?.transaction_id || body?.id;
    const amountRaw = body?.Commissions?.charge_amount || body?.commissions?.charge_amount || 
                      body?.product?.price || body?.amount || "0";
    const amount = Math.round(parseFloat(String(amountRaw).replace(",", ".")) * 100);

    // Determine plan from product name or custom field
    const productName = (body?.Product?.name || body?.product?.name || "").toLowerCase();
    let plan: "pro" | "premium" = "pro";
    if (productName.includes("premium") || productName.includes("elite")) {
      plan = "premium";
    }

    console.log(`Processing: email=${customerEmail}, status=${orderStatus}, plan=${plan}, amount=${amount}`);

    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "Customer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find user by email
    const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const user = users?.find((u) => u.email === customerEmail);

    if (!user) {
      console.error(`User not found for email: ${customerEmail}`);
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

    // Update user profile based on status
    if (isApproved) {
      await adminClient.from("profiles").update({
        plan,
        subscription_status: "active",
        payment_date: new Date().toISOString(),
      }).eq("user_id", user.id);
      console.log(`✅ User ${customerEmail} upgraded to ${plan}`);
    } else if (isRefunded) {
      await adminClient.from("profiles").update({
        plan: "free",
        subscription_status: "cancelled",
      }).eq("user_id", user.id);
      console.log(`⚠️ User ${customerEmail} downgraded to free (refund)`);
    }

    return new Response(JSON.stringify({ success: true, status: paymentStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
