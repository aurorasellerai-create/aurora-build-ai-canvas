import { useState } from "react";
import { Search, Loader2, Plus, Minus, ShieldCheck, ShieldOff, Eye, X, UserX, UserCheck, Send } from "lucide-react";
import { useAdminUsers, useUpdatePlan, useUpdateCredits, useToggleAdmin } from "./useAdminData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface UserDetail {
  user_id: string;
  display_name: string;
  email: string;
  plan: string;
  credits_balance: number;
  total_projects: number;
  completed_projects: number;
  created_at: string;
  subscription_status?: string;
  daily_builds_count?: number;
  referral_code?: string;
  ai_credits?: number;
  bonus_builds?: number;
}

const AdminUsers = ({ enabled }: { enabled: boolean }) => {
  const { data: users = [], isLoading } = useAdminUsers(enabled);
  const updatePlan = useUpdatePlan();
  const updateCredits = useUpdateCredits();
  const toggleAdmin = useToggleAdmin();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [customCredits, setCustomCredits] = useState("");

  const filtered = users.filter(
    (u: any) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCredits = (userId: string, amount: number) => {
    updateCredits.mutate({ user_id: userId, amount });
  };

  const handleCustomCredits = (userId: string) => {
    const amount = parseInt(customCredits);
    if (isNaN(amount) || amount === 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    updateCredits.mutate({ user_id: userId, amount });
    setCustomCredits("");
  };

  const handleToggleAdmin = (userId: string, currentlyAdmin: boolean) => {
    toggleAdmin.mutate({ user_id: userId, makeAdmin: !currentlyAdmin });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-bold text-foreground text-lg">Usuários ({users.length})</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-72"
          />
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total", value: users.length },
          { label: "Free", value: users.filter((u: any) => u.plan === "free").length },
          { label: "Pro", value: users.filter((u: any) => u.plan === "pro").length },
          { label: "Premium", value: users.filter((u: any) => u.plan === "premium").length },
        ].map((s) => (
          <div key={s.label} className="card-aurora p-3 text-center">
            <p className="text-lg font-display font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Usuário</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Plano</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Créditos</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Apps</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Cadastro</th>
              <th className="text-center px-4 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => (
              <tr key={u.user_id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 text-foreground font-medium">{u.display_name || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <Select value={u.plan} onValueChange={(val) => updatePlan.mutate({ user_id: u.user_id, plan: val })}>
                    <SelectTrigger className="w-28 mx-auto h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => handleCredits(u.user_id, -10)} className="p-1 rounded hover:bg-destructive/10 transition-colors" title="Remover 10"><Minus className="w-3 h-3 text-destructive" /></button>
                    <span className="text-foreground font-bold w-10 text-center">{u.credits_balance}</span>
                    <button onClick={() => handleCredits(u.user_id, 10)} className="p-1 rounded hover:bg-secondary/10 transition-colors" title="Adicionar 10"><Plus className="w-3 h-3 text-secondary" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-secondary font-medium">{u.completed_projects}</span>
                  <span className="text-muted-foreground">/{u.total_projects}</span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground text-xs">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4 text-primary" />
                    </button>
                    <button
                      onClick={() => handleToggleAdmin(u.user_id, false)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                      title="Tornar admin"
                    >
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-foreground">Detalhes do Usuário</h3>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Nome", value: selectedUser.display_name || "—" },
                    { label: "Email", value: selectedUser.email },
                    { label: "Plano", value: selectedUser.plan?.toUpperCase() },
                    { label: "Créditos", value: selectedUser.credits_balance },
                    { label: "Apps Total", value: selectedUser.total_projects },
                    { label: "Apps Prontos", value: selectedUser.completed_projects },
                    { label: "Builds Hoje", value: selectedUser.daily_builds_count ?? 0 },
                    { label: "Referral", value: selectedUser.referral_code || "—" },
                    { label: "AI Credits", value: selectedUser.ai_credits ?? 0 },
                    { label: "Bonus Builds", value: selectedUser.bonus_builds ?? 0 },
                    { label: "Status", value: selectedUser.subscription_status || "inactive" },
                    { label: "Cadastro", value: new Date(selectedUser.created_at).toLocaleDateString("pt-BR") },
                  ].map((field) => (
                    <div key={field.label} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">{field.label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{field.value}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Credit Adjust */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">Ajustar Créditos</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={customCredits}
                      onChange={(e) => setCustomCredits(e.target.value)}
                      placeholder="Ex: 50 ou -20"
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleCustomCredits(selectedUser.user_id)}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" /> Aplicar
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      updatePlan.mutate({ user_id: selectedUser.user_id, plan: "pro" });
                      setSelectedUser({ ...selectedUser, plan: "pro" });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    Upgrade → Pro
                  </button>
                  <button
                    onClick={() => {
                      updatePlan.mutate({ user_id: selectedUser.user_id, plan: "premium" });
                      setSelectedUser({ ...selectedUser, plan: "premium" });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                  >
                    Upgrade → Premium
                  </button>
                  <button
                    onClick={() => handleToggleAdmin(selectedUser.user_id, false)}
                    className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold hover:bg-secondary/20 transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" /> Tornar Admin
                  </button>
                  <button
                    onClick={() => handleToggleAdmin(selectedUser.user_id, true)}
                    className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1"
                  >
                    <ShieldOff className="w-3 h-3" /> Remover Admin
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
