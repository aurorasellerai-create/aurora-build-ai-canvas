import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";

export type PlanTier = "free" | "pro" | "premium" | "premium_unlimited";

interface SubscriptionRow {
  plan: PlanTier | null;
  subscription_status: string | null;
  payment_date: string | null;
}

export interface SubscriptionState {
  plan: PlanTier;
  status: string;
  isFree: boolean;
  isPro: boolean;
  isPremium: boolean;
  isUnlimited: boolean;
  paymentDate: string | null;
  loading: boolean;
}

const CACHE_KEY = (uid: string) => `aurora:subscription:${uid}`;

function readCache(uid: string): SubscriptionRow | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid));
    return raw ? (JSON.parse(raw) as SubscriptionRow) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(uid: string, row: SubscriptionRow | null) {
  try {
    if (row) localStorage.setItem(CACHE_KEY(uid), JSON.stringify(row));
  } catch {
    /* ignore */
  }
}

/**
 * Reads the user's active plan from `public.profiles` and hydrates from
 * localStorage on mount to avoid plan-tier flicker after refresh.
 * Privileged accounts are virtually promoted to `premium_unlimited`.
 */
export function useSubscription(): SubscriptionState {
  const { user, loading: authLoading } = useAuth();
  const { isPrivileged, loading: roleLoading } = useRole();
  const cached = user ? readCache(user.id) : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: cached,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<SubscriptionRow | null> => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, subscription_status, payment_date")
        .eq("user_id", user!.id)
        .maybeSingle();
      const row = (data as SubscriptionRow | null) ?? null;
      if (user) writeCache(user.id, row);
      return row;
    },
  });

  const rawPlan = (data?.plan as PlanTier | undefined) ?? "free";
  const plan: PlanTier = isPrivileged ? "premium_unlimited" : rawPlan;

  // Privileged users never need to "wait" — their tier is derived from roles.
  const loading =
    authLoading ||
    roleLoading ||
    (!isPrivileged && !!user && !data && isLoading);

  return {
    plan,
    status: isPrivileged ? "active" : data?.subscription_status ?? "inactive",
    isFree: plan === "free",
    isPro: plan === "pro",
    isPremium: plan === "premium" || plan === "premium_unlimited",
    isUnlimited: plan === "premium_unlimited",
    paymentDate: data?.payment_date ?? null,
    loading,
  };
}
