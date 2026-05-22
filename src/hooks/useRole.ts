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
  /** True only when roles came from a confirmed server response (not localStorage). */
  isServerConfirmed: boolean;
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
 * Server-authoritative role lookup. We expose two signals:
 *  - `roles` / `isAdmin` etc — may include a tentative value from localStorage
 *    cache for UX smoothing (badges, sidebar labels).
 *  - `isServerConfirmed` — only true after the live `user_roles` query resolves.
 *    Privileged routes (e.g. AdminRoute) must require this flag, otherwise an
 *    attacker who writes to localStorage could briefly render admin UI.
 */
export function useRole(): RoleState {
  const { user, loading: authLoading } = useAuth();
  const cached = user ? readCache(user.id) : undefined;

  const { data, isLoading, isFetched } = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    // NOTE: do NOT pass `initialData` from localStorage — that would mark the
    // query as resolved server-side and let cache spoofing pass `isServerConfirmed`.
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) return [];
      const roles = (data ?? []).map((r) => r.role as AppRole);
      writeCache(user!.id, roles);
      return roles;
    },
  });

  // Display roles: prefer server value, fall back to cache only for UX (badges).
  const serverConfirmed = !!user && isFetched && data !== undefined;
  const roles = serverConfirmed ? (data ?? []) : (cached ?? []);
  const isAdmin = roles.includes("admin");
  const isFounder = roles.includes("founder");
  const isSuperAdmin = roles.includes("super_admin");
  const isPrivileged = isAdmin || isFounder || isSuperAdmin;

  const loading = authLoading || (!!user && isLoading && !serverConfirmed);

  return { roles, isAdmin, isFounder, isSuperAdmin, isPrivileged, isServerConfirmed: serverConfirmed, loading };
}

