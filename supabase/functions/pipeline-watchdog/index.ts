// Pipeline watchdog: sweeps stalled / stuck-signing / over-time conversion jobs.
// Designed to be called by pg_cron every 30 seconds.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ ok: false, error: "missing_config" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const result: Record<string, unknown> = { ok: true };

  try {
    const { data: stalled } = await supabase.rpc("mark_stalled_conversion_jobs" as never, {
      _heartbeat_max: "60 seconds",
    } as never);
    result.stalled = stalled ?? 0;
  } catch (e) {
    result.stalled_error = String((e as Error)?.message ?? e);
  }

  try {
    const { data: signing } = await supabase.rpc("mark_signing_timeout_jobs" as never, {
      _signing_max: "180 seconds",
    } as never);
    result.signing_timeout = signing ?? 0;
  } catch (e) {
    result.signing_timeout_error = String((e as Error)?.message ?? e);
  }

  try {
    const { data: stale } = await supabase.rpc("mark_stale_conversion_jobs_as_timeout" as never, {
      _max_age: "00:10:00",
    } as never);
    result.timed_out = stale ?? 0;
  } catch (e) {
    result.timed_out_error = String((e as Error)?.message ?? e);
  }

  console.log("[PIPELINE_WATCHDOG]", JSON.stringify(result));
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
