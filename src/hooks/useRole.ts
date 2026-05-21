import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "moderator" | "admin" | "founder" | "super_admin";

export interface RoleState {
  roles: AppRole[];
  isAdmin: boolean;
  isFounder: boolean;
  isSuperAdmin: boolean;
  isPrivileged: boolean;
  loading: boolean;
}

const CACHE_KEY = (uid: string) => `aurora:roles:${uid}`;

function readCache(uid: string): AppRole[] | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY(uid));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AppRole[]) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(uid: string, roles: AppRole[]) {
  try {
    localStorage.setItem(CACHE_KEY(uid), JSON.stringify(roles));
  } catch {
    /* ignore */
  }
}

/**
 * Server-authoritative role lookup with localStorage hydration so the first
 * paint after a refresh already reflects the correct privilege level
 * (no free → admin flicker).
 */
export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const cached = user ? readCache(user.id) : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: cached,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) return cached ?? [];
      const roles = (data ?? []).map((r) => r.role as AppRole);
      writeCache(user!.id, roles);
      return roles;
    },
  });

  const roles = data ?? [];
  const isAdmin = roles.includes("admin");
  const isFounder = roles.includes("founder");
  const isSuperAdmin = roles.includes("super_admin");
  const isPrivileged = isAdmin || isFounder || isSuperAdmin;

  // Only "loading" when we have no data at all (cache miss + first fetch).
  const loading = authLoading || (!!user && !data && isLoading);

  return { roles, isAdmin, isFounder, isSuperAdmin, isPrivileged, loading };
}
