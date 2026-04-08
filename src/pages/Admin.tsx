import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Shield } from "lucide-react";
import AdminLayout, { type AdminSection } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminCredits from "@/components/admin/AdminCredits";
import AdminAiUsage from "@/components/admin/AdminAiUsage";
import AdminApps from "@/components/admin/AdminApps";
import AdminFinancial from "@/components/admin/AdminFinancial";
import AdminTools from "@/components/admin/AdminTools";
import AdminSystem from "@/components/admin/AdminSystem";

const Admin = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<AdminSection>("dashboard");

  const { data: isAdmin, isLoading: checkingRole } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin" as any,
      });
      return !!data;
    },
    enabled: !!user,
  });

  if (checkingRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
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

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <AdminDashboard enabled={true} />;
      case "users": return <AdminUsers enabled={true} />;
      case "plans": return <AdminPlans enabled={true} />;
      case "credits": return <AdminCredits enabled={true} />;
      case "ai_usage": return <AdminAiUsage enabled={true} />;
      case "apps": return <AdminApps enabled={true} />;
      case "financial": return <AdminFinancial enabled={true} />;
      case "tools": return <AdminTools />;
      case "system": return <AdminSystem />;
      default: return <AdminDashboard enabled={true} />;
    }
  };

  return (
    <AdminLayout section={section} onSectionChange={setSection}>
      {renderSection()}
    </AdminLayout>
  );
};

export default Admin;
