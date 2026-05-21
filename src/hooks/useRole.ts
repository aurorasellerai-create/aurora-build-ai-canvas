import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "moderator" | "admin" | "founder" | "super_admin";

export interface RoleState {
  roles: AppRole[];
  isAdmin: boolean;
  isFounder: boolean;
  isSuperAdmin: boolean;
  /** Founder, super_admin or admin — bypasses all platform restrictions. */
  isPrivileged: boolean;
  loading: boolean;
}

/**
 * Server-side authoritative role lookup.
 * Roles live in `public.user_roles` and are validated by RLS + DB functions.
 * The frontend cannot grant itself a role — UI only reflects what the DB confirms.
 */
export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) return [];
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = data ?? [];
  const isAdmin = roles.includes("admin");
  const isFounder = roles.includes("founder");
  const isSuperAdmin = roles.includes("super_admin");
  const isPrivileged = isAdmin || isFounder || isSuperAdmin;

  return {
    roles,
    isAdmin,
    isFounder,
    isSuperAdmin,
    isPrivileged,
    loading: authLoading || isLoading,
  };
}
