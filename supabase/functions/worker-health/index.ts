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

    let dbStatus = "disconnected";
    let queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 };

    try {
      const [waiting, active, completed, failed] = await Promise.all([
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "processing"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "done"),
        supabase.from("conversion_jobs").select("*", { count: "exact", head: true }).eq("status", "error"),
      ]);

      dbStatus = "connected";
      queueStats = {
        waiting: waiting.count ?? 0,
        active: active.count ?? 0,
        completed: completed.count ?? 0,
        failed: failed.count ?? 0,
      };
    } catch {
      dbStatus = "error";
    }

    const health = {
      status: "ok",
      mode: "serverless",
      database: dbStatus,
      worker: "internal",
      queue: queueStats,
      timestamp: new Date().toISOString(),
      version: "3.0.0",
      runtime: "edge",
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
