import { useRole } from "@/hooks/useRole";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Centralized feature gate. Anything the UI wants to lock must go through `can()`.
 * Privileged accounts (founder / super_admin / admin) always return `true`.
 *
 * Add new gates here so future SaaS modules stay consistent across the app.
 */
export type Permission =
  | "validator.use"
  | "validator.unlimited"
  | "apk.generate"
  | "apk.unlimited"
  | "ai.tools"
  | "ai.advanced"
  | "ai.video"
  | "premium.modules"
  | "admin.panel"
  | "internal.testing"
  | "billing.manage"
  | "user.manage";

export interface PermissionsState {
  can: (permission: Permission) => boolean;
  isPrivileged: boolean;
  loading: boolean;
}

export function usePermissions(): PermissionsState {
  const { isPrivileged, isAdmin, isSuperAdmin, loading: roleLoading } = useRole();
  const { isPremium, isPro, loading: subLoading } = useSubscription();

  const can = (permission: Permission): boolean => {
    if (isPrivileged) return true;

    switch (permission) {
      case "validator.use":
      case "apk.generate":
      case "ai.tools":
        return true;
      case "ai.advanced":
      case "premium.modules":
      case "validator.unlimited":
      case "apk.unlimited":
        return isPremium;
      case "ai.video":
        return isPro || isPremium;
      case "admin.panel":
      case "user.manage":
      case "billing.manage":
      case "internal.testing":
        return isAdmin || isSuperAdmin;
      default:
        return false;
    }
  };

  return {
    can,
    isPrivileged,
    loading: roleLoading || subLoading,
  };
}
