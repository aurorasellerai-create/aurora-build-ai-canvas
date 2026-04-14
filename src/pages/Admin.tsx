import { useState } from "react";
import AdminPinGate from "@/components/admin/AdminPinGate";
import AdminLayout, { type AdminSection } from "@/components/admin/AdminLayout";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminPlans from "@/components/admin/AdminPlans";
import AdminCredits from "@/components/admin/AdminCredits";
import AdminAiUsage from "@/components/admin/AdminAiUsage";
import AdminApps from "@/components/admin/AdminApps";
import AdminFinancial from "@/components/admin/AdminFinancial";
import AdminTools from "@/components/admin/AdminTools";
import AdminSystemHealth from "@/components/admin/AdminSystemHealth";
import AdminLogs from "@/components/admin/AdminLogs";
import AdminSettings from "@/components/admin/AdminSettings";
import AdminEmails from "@/components/admin/AdminEmails";

const Admin = () => {
  const [section, setSection] = useState<AdminSection>("dashboard");

  const renderSection = () => {
    switch (section) {
      case "dashboard": return <AdminDashboard enabled={true} />;
      case "users": return <AdminUsers enabled={true} />;
      case "plans": return <AdminPlans enabled={true} />;
      case "credits": return <AdminCredits enabled={true} />;
      case "ai_usage": return <AdminAiUsage enabled={true} />;
      case "apps": return <AdminApps enabled={true} />;
      case "financial": return <AdminFinancial enabled={true} />;
      case "logs": return <AdminLogs enabled={true} />;
      case "emails": return <AdminEmails enabled={true} />;
      case "tools": return <AdminTools />;
      case "system": return <AdminSystemHealth enabled={true} />;
      case "settings": return <AdminSettings />;
      default: return <AdminDashboard enabled={true} />;
    }
  };

  return (
    <AdminPinGate>
      <AdminLayout section={section} onSectionChange={setSection}>
        {renderSection()}
      </AdminLayout>
    </AdminPinGate>
  );
};

export default Admin;
