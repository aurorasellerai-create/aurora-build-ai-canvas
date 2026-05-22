import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";

/**
 * Server-validated admin gate. Roles are fetched from `public.user_roles` and
 * RLS prevents the client from spoofing them — flipping a flag in devtools is
 * not enough to gain access.
 */
const AdminRoute = ({ children, requireFounder = false }: { children: ReactNode; requireFounder?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isFounder, isSuperAdmin, isServerConfirmed, loading: roleLoading } = useRole();

  // Always wait for the live server response — never trust localStorage-cached
  // roles for privileged-route gating.
  if (authLoading || roleLoading || (user && !isServerConfirmed)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const allowed = requireFounder ? isFounder || isSuperAdmin : isAdmin || isFounder || isSuperAdmin;
  if (!allowed) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
};

export default AdminRoute;
