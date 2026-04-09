import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Check DB connectivity
    let dbStatus = "disconnected";
    let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };

    try {
      const { count: waiting } = await supabase
        .from("conversion_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: active } = await supabase
        .from("conversion_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "processing");

      const { count: completed } = await supabase
        .from("conversion_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "done");

      const { count: failed } = await supabase
        .from("conversion_jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "error");

      dbStatus = "connected";
      queueStats = {
        waiting: waiting ?? 0,
        active: active ?? 0,
        completed: completed ?? 0,
        failed: failed ?? 0,
      };
    } catch {
      dbStatus = "error";
    }

    const workerUrl = Deno.env.get("WORKER_URL")?.trim();
    let externalWorker = "not_configured";

    if (workerUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const resp = await fetch(`${workerUrl}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        externalWorker = resp.ok ? "online" : "offline";
      } catch {
        externalWorker = "offline";
      }
    }

    const health = {
      status: "ok",
      mode: externalWorker === "online" ? "worker" : "serverless_simulated",
      database: dbStatus,
      external_worker: externalWorker,
      queue: queueStats,
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      runtime: "supabase-edge-functions",
    };

    return new Response(JSON.stringify(health, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
