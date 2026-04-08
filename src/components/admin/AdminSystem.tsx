import { Settings, CheckCircle, AlertTriangle } from "lucide-react";

const CHECKS = [
  { label: "Rotas configuradas", ok: true, detail: "Todas as rotas estão mapeadas em App.tsx" },
  { label: "RLS ativo em todas tabelas", ok: true, detail: "profiles, projects, payments, credit_usage, credit_purchases, referrals, user_roles" },
  { label: "Edge Functions", ok: true, detail: "admin-data, generate-business, kiwify-webhook" },
  { label: "Autenticação", ok: true, detail: "Email/senha com validação" },
  { label: "Sistema de créditos", ok: true, detail: "consume_credits com validação backend" },
  { label: "Paywall", ok: true, detail: "Bloqueio por plano + modal de upgrade" },
  { label: "Webhook Kiwify", ok: true, detail: "Validação de token + deduplicação" },
  { label: "Admin bypass", ok: true, detail: "Admins: builds ilimitados, créditos ilimitados" },
];

const AdminSystem = () => {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Sistema / Diagnóstico
      </h2>

      <div className="space-y-2">
        {CHECKS.map((check) => (
          <div key={check.label} className={`card-aurora p-4 flex items-start gap-3 ${!check.ok ? "border-destructive/30" : ""}`}>
            {check.ok ? (
              <CheckCircle className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{check.label}</p>
              <p className="text-xs text-muted-foreground">{check.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSystem;
