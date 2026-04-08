import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export const fetchAdmin = async (action: string, method = "GET", body?: any) => {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data?action=${action}`,
    opts
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error);
  return json;
};

export function useAdminMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => fetchAdmin("metrics").then((r) => r.metrics),
    enabled,
  });
}

export function useAdminUsers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchAdmin("list").then((r) => r.users),
    enabled,
  });
}

export function useAdminGrowth(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-growth"],
    queryFn: () => fetchAdmin("growth").then((r) => r.growth),
    enabled,
  });
}

export function useAdminCredits(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-credits"],
    queryFn: () => fetchAdmin("credits"),
    enabled,
  });
}

export function useAdminAiUsage(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-ai-usage"],
    queryFn: () => fetchAdmin("ai_usage"),
    enabled,
  });
}

export function useAdminApps(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-apps"],
    queryFn: () => fetchAdmin("apps"),
    enabled,
  });
}

export function useAdminFinancial(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-financial"],
    queryFn: () => fetchAdmin("financial"),
    enabled,
  });
}

export function useAdminSystemHealth(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-system-health"],
    queryFn: () => fetchAdmin("system_health"),
    enabled,
    refetchInterval: 30000,
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, plan }: { user_id: string; plan: string }) =>
      fetchAdmin("update_plan", "POST", { user_id, plan }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-metrics"] });
      toast({ title: "Plano atualizado!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useUpdateCredits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, amount }: { user_id: string; amount: number }) =>
      fetchAdmin("update_credits", "POST", { user_id, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-credits"] });
      toast({ title: "Créditos atualizados!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}

export function useToggleAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ user_id, makeAdmin }: { user_id: string; makeAdmin: boolean }) =>
      fetchAdmin("toggle_admin", "POST", { user_id, makeAdmin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Permissão atualizada!" });
    },
    onError: (err: Error) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });
}
