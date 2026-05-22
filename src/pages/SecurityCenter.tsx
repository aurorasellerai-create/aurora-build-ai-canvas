import { EnterpriseSecurityDashboard } from "@/components/security/EnterpriseSecurityDashboard";

export default function SecurityCenter() {
  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <EnterpriseSecurityDashboard projectName="Aurora Build AI" />
      </div>
    </div>
  );
}
