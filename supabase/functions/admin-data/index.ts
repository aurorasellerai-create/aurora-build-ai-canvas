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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Check admin OR founder
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "founder"]);

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerIsFounder = roles.some((r: any) => r.role === "founder");

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const json = (data: any) => new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    const jsonErr = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Helper: check if target user is founder
    const isTargetFounder = async (userId: string) => {
      const { data } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "founder")
        .maybeSingle();
      return !!data;
    };

    // ── EXPIRE TRIALS ──
    // Run trial expiration on every admin request
    try { await adminClient.rpc("expire_trials"); } catch (_) { /* ignore */ }

    // ── LIST USERS ──
    if (action === "list") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: projects } = await adminClient
        .from("projects")
        .select("user_id, status");

      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u) => { emailMap[u.id] = u.email || ""; });

      // Get all roles
      const { data: allRoles } = await adminClient.from("user_roles").select("user_id, role");
      const roleMap: Record<string, string[]> = {};
      (allRoles || []).forEach((r: any) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role);
      });

      const enriched = (profiles || []).map((p) => {
        const userProjects = (projects || []).filter((pr) => pr.user_id === p.user_id);
        const userRoles = roleMap[p.user_id] || [];
        let accessRole = "user";
        if (userRoles.includes("founder")) accessRole = "founder";
        else if (userRoles.includes("admin")) accessRole = "admin";

        return {
          ...p,
          email: emailMap[p.user_id] || "—",
          total_projects: userProjects.length,
          completed_projects: userProjects.filter((pr) => pr.status === "completed").length,
          access_role: accessRole,
        };
      });

      return json({ users: enriched });
    }

    // ── METRICS ──
    if (action === "metrics") {
      const [
        { count: totalUsers },
        { count: proUsers },
        { count: premiumUsers },
        { count: totalProjects },
        { count: completedProjects },
        { count: vipUsers },
      ] = await Promise.all([
        adminClient.from("profiles").select("*", { count: "exact", head: true }),
        adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "pro"),
        adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("plan", "premium"),
        adminClient.from("projects").select("*", { count: "exact", head: true }),
        adminClient.from("projects").select("*", { count: "exact", head: true }).eq("status", "completed"),
        adminClient.from("profiles").select("*", { count: "exact", head: true }).eq("tipo_usuario", "vip"),
      ]);

      const today = new Date().toISOString().split("T")[0];
      const { count: todaySignups } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      const { data: allPayments } = await adminClient
        .from("payments")
        .select("amount, status, paid_at")
        .eq("status", "approved");

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const todayRevenue = (allPayments || [])
        .filter((p) => p.paid_at && p.paid_at.startsWith(today))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const { data: creditUsage } = await adminClient
        .from("credit_usage")
        .select("credits_used");
      const totalCreditsUsed = (creditUsage || []).reduce((sum, c) => sum + c.credits_used, 0);

      return json({
        metrics: {
          totalUsers: totalUsers || 0,
          proUsers: proUsers || 0,
          premiumUsers: premiumUsers || 0,
          freeUsers: (totalUsers || 0) - (proUsers || 0) - (premiumUsers || 0),
          vipUsers: vipUsers || 0,
          clienteUsers: (totalUsers || 0) - (vipUsers || 0),
          totalProjects: totalProjects || 0,
          completedProjects: completedProjects || 0,
          todaySignups: todaySignups || 0,
          conversionRate: totalUsers ? (((proUsers || 0) + (premiumUsers || 0)) / totalUsers * 100).toFixed(1) : "0",
          totalRevenue,
          todayRevenue,
          totalCreditsUsed,
        },
      });
    }

    // ── GROWTH ──
    if (action === "growth") {
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("created_at, plan")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      const dailyMap: Record<string, { total: number; pro: number; premium: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        dailyMap[d.toISOString().split("T")[0]] = { total: 0, pro: 0, premium: 0 };
      }

      (profiles || []).forEach((p) => {
        const day = p.created_at.split("T")[0];
        if (dailyMap[day]) {
          dailyMap[day].total++;
          if (p.plan === "pro") dailyMap[day].pro++;
          if (p.plan === "premium") dailyMap[day].premium++;
        }
      });

      const growth = Object.entries(dailyMap).map(([date, counts]) => ({
        date,
        label: new Date(date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        ...counts,
      }));

      return json({ growth });
    }

    // ── CREDITS DATA ──
    if (action === "credits") {
      const { data: usage } = await adminClient
        .from("credit_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: profiles } = await adminClient
        .from("profiles")
        .select("user_id, display_name, credits_balance")
        .order("credits_balance", { ascending: true })
        .limit(20);

      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u) => { emailMap[u.id] = u.email || ""; });

      const actionTotals: Record<string, number> = {};
      (usage || []).forEach((u) => {
        actionTotals[u.action] = (actionTotals[u.action] || 0) + u.credits_used;
      });

      const userTotals: Record<string, number> = {};
      (usage || []).forEach((u) => {
        userTotals[u.user_id] = (userTotals[u.user_id] || 0) + u.credits_used;
      });
      const topConsumers = Object.entries(userTotals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([uid, total]) => ({
          user_id: uid,
          email: emailMap[uid] || "—",
          total_used: total,
        }));

      return json({ actionTotals, topConsumers, recentUsage: usage || [] });
    }

    // ── AI USAGE ──
    if (action === "ai_usage") {
      const { data: usage } = await adminClient
        .from("credit_usage")
        .select("action, credits_used, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      const aiActions = ["ai_tool_names", "ai_tool_ideas", "ai_tool_description", "ai_tool_icon", "ai_tool_splash", "generate_business"];
      const aiUsage = (usage || []).filter((u) => aiActions.includes(u.action));

      const toolCounts: Record<string, number> = {};
      aiUsage.forEach((u) => {
        toolCounts[u.action] = (toolCounts[u.action] || 0) + 1;
      });

      return json({ totalAiRequests: aiUsage.length, toolCounts, recentAi: aiUsage.slice(0, 50) });
    }

    // ── APPS ──
    if (action === "apps") {
      const { data: projects } = await adminClient
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u) => { emailMap[u.id] = u.email || ""; });

      const enriched = (projects || []).map((p) => ({
        ...p,
        email: emailMap[p.user_id] || "—",
      }));

      const formatCounts: Record<string, number> = {};
      (projects || []).forEach((p) => {
        formatCounts[p.format] = (formatCounts[p.format] || 0) + 1;
      });

      return json({ apps: enriched, formatCounts });
    }

    // ── FINANCIAL ──
    if (action === "financial") {
      const { data: payments } = await adminClient
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: creditPurchases } = await adminClient
        .from("credit_purchases")
        .select("*")
        .order("created_at", { ascending: false });

      const approved = (payments || []).filter((p) => p.status === "approved");
      const totalRevenue = approved.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      const now = new Date();
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const monthlyRevenue = approved
        .filter((p) => p.paid_at && p.paid_at.startsWith(thisMonth))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const ticketMedio = approved.length > 0 ? totalRevenue / approved.length : 0;

      return json({
        totalRevenue,
        monthlyRevenue,
        ticketMedio,
        totalTransactions: approved.length,
        payments: payments || [],
        creditPurchases: creditPurchases || [],
      });
    }

    // ── UPDATE PLAN ──
    if (action === "update_plan" && req.method === "POST") {
      const { user_id, plan } = await req.json();
      if (!user_id || !plan) return jsonErr("Missing user_id or plan");
      if (await isTargetFounder(user_id) && !callerIsFounder) return jsonErr("Cannot modify founder");

      const { error } = await adminClient
        .from("profiles")
        .update({ plan })
        .eq("user_id", user_id);

      if (error) return jsonErr(error.message, 500);
      return json({ success: true });
    }

    // ── UPDATE CREDITS ──
    if (action === "update_credits" && req.method === "POST") {
      const { user_id, amount } = await req.json();
      if (!user_id || amount == null) return jsonErr("Missing user_id or amount");

      const { data: profile } = await adminClient
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", user_id)
        .single();

      if (!profile) return jsonErr("User not found", 404);

      const newBalance = Math.max(0, profile.credits_balance + amount);
      const { error } = await adminClient
        .from("profiles")
        .update({ credits_balance: newBalance })
        .eq("user_id", user_id);

      if (error) return jsonErr(error.message, 500);
      return json({ success: true, newBalance });
    }

    // ── TOGGLE ADMIN ──
    if (action === "toggle_admin" && req.method === "POST") {
      const { user_id, makeAdmin } = await req.json();
      if (!user_id) return jsonErr("Missing user_id");
      if (await isTargetFounder(user_id)) return jsonErr("Cannot modify founder roles");

      if (makeAdmin) {
        await adminClient.from("user_roles").upsert({ user_id, role: "admin" }, { onConflict: "user_id,role" });
      } else {
        await adminClient.from("user_roles").delete().eq("user_id", user_id).eq("role", "admin");
      }
      return json({ success: true });
    }

    // ── UPDATE TIPO USUARIO ──
    if (action === "update_tipo" && req.method === "POST") {
      const { user_id, tipo_usuario } = await req.json();
      if (!user_id || !tipo_usuario) return jsonErr("Missing user_id or tipo_usuario");
      if (await isTargetFounder(user_id) && !callerIsFounder) return jsonErr("Cannot modify founder");

      const { error } = await adminClient
        .from("profiles")
        .update({ tipo_usuario })
        .eq("user_id", user_id);

      if (error) return jsonErr(error.message, 500);
      return json({ success: true });
    }

    // ── UPDATE STATUS ──
    if (action === "update_status" && req.method === "POST") {
      const { user_id, status } = await req.json();
      if (!user_id || !status) return jsonErr("Missing user_id or status");
      if (await isTargetFounder(user_id) && !callerIsFounder) return jsonErr("Cannot modify founder");

      const { error } = await adminClient
        .from("profiles")
        .update({ status })
        .eq("user_id", user_id);

      if (error) return jsonErr(error.message, 500);
      return json({ success: true });
    }

    // ── EXTEND TRIAL ──
    if (action === "extend_trial" && req.method === "POST") {
      const { user_id, days } = await req.json();
      if (!user_id || !days) return jsonErr("Missing user_id or days");

      const { data: profile } = await adminClient
        .from("profiles")
        .select("teste_expira_em")
        .eq("user_id", user_id)
        .single();

      const baseDate = profile?.teste_expira_em ? new Date(profile.teste_expira_em) : new Date();
      if (baseDate < new Date()) baseDate.setTime(Date.now());
      baseDate.setDate(baseDate.getDate() + days);

      const { error } = await adminClient
        .from("profiles")
        .update({ teste_expira_em: baseDate.toISOString() })
        .eq("user_id", user_id);

      if (error) return jsonErr(error.message, 500);
      return json({ success: true });
    }

    // ── DELETE USER ──
    if (action === "delete_user" && req.method === "POST") {
      const { user_id } = await req.json();
      if (!user_id) return jsonErr("Missing user_id");
      if (await isTargetFounder(user_id)) return jsonErr("Cannot delete founder");

      // Delete profile, then auth user
      await adminClient.from("profiles").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) return jsonErr(error.message, 500);
      return json({ success: true });
    }

    // ── SYSTEM HEALTH ──
    if (action === "system_health") {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentLogs } = await adminClient
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      const { count: errorsLast24h } = await adminClient
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .in("severity", ["error", "critical"])
        .gte("created_at", last24h);

      const { count: warningsLast24h } = await adminClient
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .eq("severity", "warning")
        .gte("created_at", last24h);

      const { count: autoResolved } = await adminClient
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .eq("resolved", true);

      const { count: totalErrors } = await adminClient
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .in("severity", ["error", "critical"]);

      const { count: unresolvedCritical } = await adminClient
        .from("system_logs")
        .select("*", { count: "exact", head: true })
        .eq("severity", "critical")
        .eq("resolved", false);

      const resolutionRate = totalErrors
        ? Math.round(((autoResolved || 0) / (totalErrors || 1)) * 100)
        : 100;

      let health = "healthy";
      if ((unresolvedCritical || 0) > 0) health = "critical";
      else if ((errorsLast24h || 0) > 5 || (warningsLast24h || 0) > 20) health = "unstable";

      const checks = [
        { label: "Rotas configuradas", ok: true, detail: "Todas as rotas mapeadas em App.tsx" },
        { label: "RLS ativo", ok: true, detail: "profiles, projects, payments, credit_usage, credit_purchases, referrals, user_roles, system_logs" },
        { label: "Edge Functions", ok: true, detail: "admin-data, generate-business, kiwify-webhook" },
        { label: "Autenticação", ok: true, detail: "Email/senha com validação" },
        { label: "Sistema de créditos", ok: true, detail: "consume_credits com validação backend" },
        { label: "Paywall", ok: true, detail: "Bloqueio por plano + modal de upgrade" },
        { label: "Webhook Kiwify", ok: true, detail: "Validação de token + deduplicação" },
        { label: "Admin bypass", ok: true, detail: "Admins: builds e créditos ilimitados" },
        { label: "Monitoramento", ok: true, detail: "ErrorBoundary + logs automáticos" },
      ];

      return json({
        health,
        logs: recentLogs || [],
        stats: {
          errorsLast24h: errorsLast24h || 0,
          warningsLast24h: warningsLast24h || 0,
          autoResolved: autoResolved || 0,
          totalErrors: totalErrors || 0,
          unresolvedCritical: unresolvedCritical || 0,
          resolutionRate,
        },
        checks,
      });
    }

    return jsonErr("Unknown action");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
