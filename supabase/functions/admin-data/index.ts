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

    // Verify user is admin using their JWT
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

    // Check admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    if (action === "list") {
      // Get all profiles with project counts
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Get project counts per user
      const { data: projects } = await adminClient
        .from("projects")
        .select("user_id, status");

      // Get auth users for emails
      const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });

      const emailMap: Record<string, string> = {};
      authUsers?.forEach((u) => {
        emailMap[u.id] = u.email || "";
      });

      const enriched = (profiles || []).map((p) => {
        const userProjects = (projects || []).filter((pr) => pr.user_id === p.user_id);
        return {
          ...p,
          email: emailMap[p.user_id] || "—",
          total_projects: userProjects.length,
          completed_projects: userProjects.filter((pr) => pr.status === "completed").length,
        };
      });

      return new Response(JSON.stringify({ users: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "metrics") {
      const { count: totalUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: proUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("plan", "pro");

      const { count: premiumUsers } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("plan", "premium");

      const { count: totalProjects } = await adminClient
        .from("projects")
        .select("*", { count: "exact", head: true });

      const { count: completedProjects } = await adminClient
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed");

      // Today's signups
      const today = new Date().toISOString().split("T")[0];
      const { count: todaySignups } = await adminClient
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);

      // Revenue metrics
      const { data: allPayments } = await adminClient
        .from("payments")
        .select("amount, status, paid_at")
        .eq("status", "approved");

      const totalRevenue = (allPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const todayRevenue = (allPayments || [])
        .filter((p) => p.paid_at && p.paid_at.startsWith(today))
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      return new Response(
        JSON.stringify({
          metrics: {
            totalUsers: totalUsers || 0,
            proUsers: proUsers || 0,
            premiumUsers: premiumUsers || 0,
            freeUsers: (totalUsers || 0) - (proUsers || 0) - (premiumUsers || 0),
            totalProjects: totalProjects || 0,
            completedProjects: completedProjects || 0,
            todaySignups: todaySignups || 0,
            conversionRate: totalUsers ? (((proUsers || 0) + (premiumUsers || 0)) / totalUsers * 100).toFixed(1) : "0",
            totalRevenue,
            todayRevenue,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "growth") {
      // Get signups per day for last 30 days
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("created_at, plan")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: true });

      const dailyMap: Record<string, { total: number; pro: number; premium: number }> = {};
      
      // Fill last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dailyMap[key] = { total: 0, pro: 0, premium: 0 };
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

      return new Response(JSON.stringify({ growth }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_plan" && req.method === "POST") {
      const { user_id, plan } = await req.json();
      if (!user_id || !plan) {
        return new Response(JSON.stringify({ error: "Missing user_id or plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient
        .from("profiles")
        .update({ plan })
        .eq("user_id", user_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
