import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface AdminPinGateProps {
  children: ReactNode;
}

const AdminPinGate = ({ children }: AdminPinGateProps) => {
  const { user, loading: authLoading } = useAuth();

  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["admin-role-gate", user?.id],
    queryFn: async () => {
      const { data: isAdminRole } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin" as any,
      });
      const { data: isFounderRole } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "founder" as any,
      });
      return !!isAdminRole || !!isFounderRole;
    },
    enabled: !!user,
  });

  if (authLoading || checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center card-aurora p-8 max-w-md">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Acesso negado</h1>
          <p className="text-muted-foreground text-sm mb-4">Você não tem permissão para acessar este painel.</p>
          <Link to="/dashboard" className="text-primary text-sm hover:underline">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export const adminLogout = () => {
  window.location.href = "/dashboard";
};

export default AdminPinGate;
