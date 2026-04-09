import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CleanupLog {
  jobs_marked: number;
  jobs_deleted: number;
  files_removed: number;
  skipped_safe: number;
  errors: string[];
  details: { id: string; action: string; reason: string }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body, null, 2), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceKey) {
      return respond({ error: "Missing backend config" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: require admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Não autorizado" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return respond({ error: "Token inválido" }, 401);

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return respond({ error: "Acesso restrito a administradores" }, 403);

    // Parse mode: dry_run | mark | delete
    let body: { mode?: string } = { mode: "dry_run" };
    try {
      body = await req.json();
    } catch { /* default to dry_run */ }

    const mode = body.mode || "dry_run";
    const log: CleanupLog = {
      jobs_marked: 0,
      jobs_deleted: 0,
      files_removed: 0,
      skipped_safe: 0,
      errors: [],
      details: [],
    };

    console.log(`[CLEANUP] Mode: ${mode}, User: ${user.email}`);

    // ==========================================
    // STEP 1: Find candidates for marking
    // Jobs that are failed/error, have no download, and are older than 15 days
    // ==========================================
    const { data: markCandidates, error: markErr } = await supabase
      .from("conversion_jobs")
      .select("id, status, download_url, created_at, marked_for_deletion")
      .in("status", ["error", "failed", "cancelled"])
      .is("download_url", null)
      .eq("marked_for_deletion", false)
      .lt("created_at", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString());

    if (markErr) {
      log.errors.push(`Mark query error: ${markErr.message}`);
    }

    const toMark = markCandidates ?? [];

    // Count safe jobs (would never be touched)
    const { count: safeCount } = await supabase
      .from("conversion_jobs")
      .select("*", { count: "exact", head: true })
      .or("status.eq.done,download_url.neq.null,marked_for_deletion.eq.false");
    log.skipped_safe = safeCount ?? 0;

    // ==========================================
    // STEP 2: Mark candidates (only in "mark" mode)
    // ==========================================
    if (mode === "mark" && toMark.length > 0) {
      const ids = toMark.map((j) => j.id);
      const { error: updateErr } = await supabase
        .from("conversion_jobs")
        .update({
          archived: true,
          marked_for_deletion: true,
          deletion_scheduled_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .in("id", ids);

      if (updateErr) {
        log.errors.push(`Mark update error: ${updateErr.message}`);
      } else {
        log.jobs_marked = ids.length;
        for (const j of toMark) {
          log.details.push({ id: j.id, action: "marked", reason: `status=${j.status}, no download, old` });
        }
      }
    } else {
      // dry_run: just log what would be marked
      for (const j of toMark) {
        log.details.push({ id: j.id, action: "would_mark", reason: `status=${j.status}, no download, old` });
      }
      log.jobs_marked = toMark.length;
    }

    // ==========================================
    // STEP 3: Delete jobs that were marked > 30 days ago (only in "delete" mode)
    // FAIL-SAFE: if ANY error occurs, abort entirely
    // ==========================================
    if (mode === "delete") {
      const { data: deleteCandidates, error: delQueryErr } = await supabase
        .from("conversion_jobs")
        .select("id, download_url, status")
        .eq("marked_for_deletion", true)
        .lt("deletion_scheduled_at", new Date().toISOString());

      if (delQueryErr) {
        log.errors.push(`Delete query error: ${delQueryErr.message}`);
        // FAIL-SAFE: abort
        await logToSystem(supabase, user.id, log);
        return respond({ mode, log, aborted: true, reason: "Query error during delete phase" });
      }

      const toDelete = (deleteCandidates ?? []).filter((j) => {
        // TRIPLE SAFETY CHECK: never delete completed or jobs with downloads
        if (j.status === "done" || j.status === "completed") {
          log.details.push({ id: j.id, action: "skipped_safe", reason: "status is done/completed" });
          return false;
        }
        if (j.download_url) {
          log.details.push({ id: j.id, action: "skipped_safe", reason: "has download_url" });
          return false;
        }
        return true;
      });

      if (toDelete.length > 0) {
        const ids = toDelete.map((j) => j.id);
        const { error: deleteErr } = await supabase
          .from("conversion_jobs")
          .delete()
          .in("id", ids);

        if (deleteErr) {
          log.errors.push(`Delete error: ${deleteErr.message}`);
          // FAIL-SAFE: abort, nothing partially deleted due to transaction
        } else {
          log.jobs_deleted = ids.length;
          for (const j of toDelete) {
            log.details.push({ id: j.id, action: "deleted", reason: "marked + expired + no download" });
          }
        }
      }
    }

    // Log to system_logs
    await logToSystem(supabase, user.id, log);

    console.log(`[CLEANUP] Complete:`, JSON.stringify(log));
    return respond({ mode, log });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[CLEANUP] Fatal:", msg);
    return respond({ error: msg, aborted: true }, 500);
  }
});

async function logToSystem(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  log: CleanupLog,
) {
  try {
    await supabase.from("system_logs").insert({
      user_id: userId,
      message: `Cleanup executed: marked=${log.jobs_marked}, deleted=${log.jobs_deleted}, files=${log.files_removed}, safe=${log.skipped_safe}`,
      severity: log.errors.length > 0 ? "warning" : "info",
      category: "cleanup",
      details: log as any,
    });
  } catch (e) {
    console.error("[CLEANUP] Failed to write system log:", e);
  }
}
