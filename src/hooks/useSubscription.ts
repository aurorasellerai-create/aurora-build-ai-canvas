import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";

export type PlanTier = "free" | "pro" | "premium" | "premium_unlimited";

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

/**
 * Reads the user's active plan + subscription status from `public.profiles`.
 * Founder / super_admin / admin accounts are virtually promoted to `premium_unlimited`
 * so every gate downstream resolves to unrestricted access.
 */
export function useSubscription(): SubscriptionState {
  const { user, loading: authLoading } = useAuth();
  const { isPrivileged, loading: roleLoading } = useRole();

  const { data, isLoading } = useQuery({
    queryKey: ["subscription", user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, subscription_status, payment_date")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const rawPlan = (data?.plan as PlanTier | undefined) ?? "free";
  const plan: PlanTier = isPrivileged ? "premium_unlimited" : rawPlan;

  return {
    plan,
    status: isPrivileged ? "active" : data?.subscription_status ?? "inactive",
    isFree: plan === "free",
    isPro: plan === "pro",
    isPremium: plan === "premium" || plan === "premium_unlimited",
    isUnlimited: plan === "premium_unlimited",
    paymentDate: data?.payment_date ?? null,
    loading: authLoading || roleLoading || isLoading,
  };
}
