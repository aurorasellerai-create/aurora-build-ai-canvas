import { useState } from "react";
import { Search, Loader2, Crown, User, ShieldCheck, ShieldOff, Eye, X, Send, Lock, Unlock, Trash2, Clock, ChevronDown, MoreHorizontal } from "lucide-react";
import { useAdminUsers, useUpdatePlan, useUpdateCredits, useToggleAdmin, useUpdateTipo, useUpdateStatus, useExtendTrial, useDeleteUser } from "./useAdminData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
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
  tipo_usuario: string;
  teste_expira_em?: string | null;
  status: string;
  access_role: string;
}

type FilterType = "all" | "vip" | "cliente" | "premium";

const getRoleBadge = (role: string) => {
  if (role === "founder") return <Badge className="bg-purple-600 text-white border-purple-500 text-[10px]">👑 Founder</Badge>;
  if (role === "admin") return <Badge className="bg-blue-600 text-white border-blue-500 text-[10px]">🛠️ Admin</Badge>;
  return <Badge variant="outline" className="text-[10px]">👤 User</Badge>;
};

const getTipoBadge = (tipo: string) => {
  if (tipo === "vip") return <Badge className="bg-amber-500 text-white border-amber-400 text-[10px]">👑 VIP</Badge>;
  return <Badge variant="outline" className="text-[10px]">👤 Cliente</Badge>;
};

const getStatusBadge = (status: string) => {
  if (status === "bloqueado") return <Badge variant="destructive" className="text-[10px]">🔒 Bloqueado</Badge>;
  return <Badge className="bg-emerald-600 text-white border-emerald-500 text-[10px]">✅ Ativo</Badge>;
};

const getTrialDaysLeft = (teste_expira_em?: string | null): number | null => {
  if (!teste_expira_em) return null;
  const diff = new Date(teste_expira_em).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const AdminUsers = ({ enabled }: { enabled: boolean }) => {
  const { data: users = [], isLoading } = useAdminUsers(enabled);
  const updatePlan = useUpdatePlan();
  const updateCredits = useUpdateCredits();
  const toggleAdmin = useToggleAdmin();
  const updateTipo = useUpdateTipo();
  const updateStatus = useUpdateStatus();
  const extendTrial = useExtendTrial();
  const deleteUser = useDeleteUser();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [customCredits, setCustomCredits] = useState("");
  const [trialDays, setTrialDays] = useState("7");

  const filtered = users
    .filter((u: any) => {
      if (filter === "vip") return u.tipo_usuario === "vip";
      if (filter === "cliente") return u.tipo_usuario === "cliente";
      if (filter === "premium") return u.plan === "premium";
      return true;
    })
    .filter(
      (u: any) =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase())
    );

  const handleCustomCredits = (userId: string) => {
    const amount = parseInt(customCredits);
    if (isNaN(amount) || amount === 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    updateCredits.mutate({ user_id: userId, amount });
    setCustomCredits("");
  };

  const isFounder = (u: any) => u.access_role === "founder";

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const vipCount = users.filter((u: any) => u.tipo_usuario === "vip").length;
  const clienteCount = users.filter((u: any) => u.tipo_usuario === "cliente").length;
  const premiumCount = users.filter((u: any) => u.plan === "premium").length;
  const expiringUsers = users.filter((u: any) => {
    const days = getTrialDaysLeft(u.teste_expira_em);
    return days !== null && days > 0 && days <= 3;
  });

  const statsCards = [
    { label: "Total", value: users.length, icon: "📊", filterKey: "all" as FilterType },
    { label: "VIP", value: vipCount, icon: "👑", filterKey: "vip" as FilterType },
    { label: "Clientes", value: clienteCount, icon: "👤", filterKey: "cliente" as FilterType },
    { label: "Premium", value: premiumCount, icon: "⭐", filterKey: "premium" as FilterType },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-bold text-foreground text-lg">Usuários do Sistema ({users.length})</h2>
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

      {/* Expiring Alert */}
      {expiringUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-300">
            <span className="font-bold">{expiringUsers.length}</span> usuário(s) com teste expirando em até 3 dias
          </p>
        </div>
      )}

      {/* Stats cards - clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {statsCards.map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter(s.filterKey)}
            className={`card-aurora p-3 text-center transition-all cursor-pointer ${filter === s.filterKey ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"}`}
          >
            <p className="text-lg font-display font-bold text-foreground">{s.icon} {s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2">
        {[
          { key: "all" as FilterType, label: "Todos", count: users.length },
          { key: "vip" as FilterType, label: "👑 VIP", count: vipCount },
          { key: "cliente" as FilterType, label: "👤 Clientes", count: clienteCount },
          { key: "premium" as FilterType, label: "⭐ Premium", count: premiumCount },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Usuário</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Email</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Tipo</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Acesso</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Plano</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Créditos</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: any) => {
              const daysLeft = getTrialDaysLeft(u.teste_expira_em);
              const founder = isFounder(u);
              return (
                <tr key={u.user_id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${u.status === "bloqueado" ? "opacity-60" : ""} ${founder ? "bg-purple-500/5" : ""}`}>
                  <td className="px-3 py-3 text-foreground font-medium">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-1">
                        {founder && <span className="text-purple-400">👑</span>}
                        {u.display_name || "—"}
                      </span>
                      {daysLeft !== null && daysLeft > 0 && daysLeft <= 7 && (
                        <span className="text-[10px] text-amber-400">⏳ {daysLeft}d restante(s)</span>
                      )}
                      {daysLeft !== null && daysLeft <= 0 && (
                        <span className="text-[10px] text-destructive">⚠️ Teste expirado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground text-xs">{u.email}</td>
                  <td className="px-3 py-3 text-center">{getTipoBadge(u.tipo_usuario)}</td>
                  <td className="px-3 py-3 text-center">{getRoleBadge(u.access_role)}</td>
                  <td className="px-3 py-3 text-center">
                    <Select
                      value={u.plan}
                      onValueChange={(val) => updatePlan.mutate({ user_id: u.user_id, plan: val })}
                      disabled={founder}
                    >
                      <SelectTrigger className="w-24 mx-auto h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-foreground font-bold">{u.credits_balance}</span>
                  </td>
                  <td className="px-3 py-3 text-center">{getStatusBadge(u.status)}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                        title="Detalhes"
                      >
                        <Eye className="w-4 h-4 text-primary" />
                      </button>
                      {!founder && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {u.tipo_usuario !== "vip" && (
                              <DropdownMenuItem onClick={() => updateTipo.mutate({ user_id: u.user_id, tipo_usuario: "vip" })}>
                                <Crown className="w-3 h-3 mr-2 text-amber-400" /> Tornar VIP
                              </DropdownMenuItem>
                            )}
                            {u.tipo_usuario !== "cliente" && (
                              <DropdownMenuItem onClick={() => updateTipo.mutate({ user_id: u.user_id, tipo_usuario: "cliente" })}>
                                <User className="w-3 h-3 mr-2" /> Tornar Cliente
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {u.access_role !== "admin" && u.access_role !== "founder" && (
                              <DropdownMenuItem onClick={() => toggleAdmin.mutate({ user_id: u.user_id, makeAdmin: true })}>
                                <ShieldCheck className="w-3 h-3 mr-2 text-blue-400" /> Tornar Admin
                              </DropdownMenuItem>
                            )}
                            {u.access_role === "admin" && (
                              <DropdownMenuItem onClick={() => toggleAdmin.mutate({ user_id: u.user_id, makeAdmin: false })}>
                                <ShieldOff className="w-3 h-3 mr-2" /> Remover Admin
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updatePlan.mutate({ user_id: u.user_id, plan: "free" })}>
                              <ChevronDown className="w-3 h-3 mr-2" /> Rebaixar → Free
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status === "ativo" ? (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ user_id: u.user_id, status: "bloqueado" })} className="text-destructive">
                                <Lock className="w-3 h-3 mr-2" /> Bloquear
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ user_id: u.user_id, status: "ativo" })}>
                                <Unlock className="w-3 h-3 mr-2 text-emerald-400" /> Desbloquear
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este usuário?")) {
                                  deleteUser.mutate({ user_id: u.user_id });
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
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
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-lg text-foreground">Detalhes do Usuário</h3>
                  {getStatusBadge(selectedUser.status)}
                </div>
                <button onClick={() => setSelectedUser(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Nome", value: selectedUser.display_name || "—" },
                    { label: "Email", value: selectedUser.email },
                    { label: "Tipo", value: selectedUser.tipo_usuario === "vip" ? "👑 VIP" : "👤 Cliente" },
                    { label: "Acesso", value: selectedUser.access_role === "founder" ? "👑 Founder" : selectedUser.access_role === "admin" ? "🛠️ Admin" : "👤 User" },
                    { label: "Plano", value: selectedUser.plan?.toUpperCase() },
                    { label: "Créditos", value: selectedUser.credits_balance },
                    { label: "Apps Total", value: selectedUser.total_projects },
                    { label: "Apps Prontos", value: selectedUser.completed_projects },
                    { label: "Builds Hoje", value: selectedUser.daily_builds_count ?? 0 },
                    { label: "AI Credits", value: selectedUser.ai_credits ?? 0 },
                    { label: "Teste Expira", value: selectedUser.teste_expira_em ? new Date(selectedUser.teste_expira_em).toLocaleDateString("pt-BR") : "—" },
                    { label: "Cadastro", value: new Date(selectedUser.created_at).toLocaleDateString("pt-BR") },
                  ].map((field) => (
                    <div key={field.label} className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground uppercase font-semibold">{field.label}</p>
                      <p className="text-sm font-medium text-foreground mt-0.5">{field.value}</p>
                    </div>
                  ))}
                </div>

                {/* Credit Adjust */}
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

                {/* Extend Trial */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold mb-2">⏳ Estender Teste</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={trialDays}
                      onChange={(e) => setTrialDays(e.target.value)}
                      placeholder="Dias"
                      className="w-24 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">dias</span>
                    <button
                      onClick={() => {
                        const days = parseInt(trialDays);
                        if (!days || days <= 0) { toast({ title: "Dias inválido", variant: "destructive" }); return; }
                        extendTrial.mutate({ user_id: selectedUser.user_id, days });
                      }}
                      disabled={isFounder(selectedUser)}
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                    >
                      <Clock className="w-3 h-3" /> Estender
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Ações Rápidas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.tipo_usuario !== "vip" && (
                      <button
                        onClick={() => { updateTipo.mutate({ user_id: selectedUser.user_id, tipo_usuario: "vip" }); setSelectedUser({ ...selectedUser, tipo_usuario: "vip" }); }}
                        disabled={isFounder(selectedUser)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Crown className="w-3 h-3" /> Tornar VIP
                      </button>
                    )}
                    {selectedUser.tipo_usuario !== "cliente" && (
                      <button
                        onClick={() => { updateTipo.mutate({ user_id: selectedUser.user_id, tipo_usuario: "cliente" }); setSelectedUser({ ...selectedUser, tipo_usuario: "cliente" }); }}
                        disabled={isFounder(selectedUser)}
                        className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/80 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <User className="w-3 h-3" /> Tornar Cliente
                      </button>
                    )}
                    {selectedUser.access_role !== "admin" && selectedUser.access_role !== "founder" && (
                      <button
                        onClick={() => { toggleAdmin.mutate({ user_id: selectedUser.user_id, makeAdmin: true }); setSelectedUser({ ...selectedUser, access_role: "admin" }); }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3 h-3" /> Tornar Admin
                      </button>
                    )}
                    {selectedUser.access_role === "admin" && (
                      <button
                        onClick={() => { toggleAdmin.mutate({ user_id: selectedUser.user_id, makeAdmin: false }); setSelectedUser({ ...selectedUser, access_role: "user" }); }}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1"
                      >
                        <ShieldOff className="w-3 h-3" /> Remover Admin
                      </button>
                    )}
                    {selectedUser.status === "ativo" ? (
                      <button
                        onClick={() => { updateStatus.mutate({ user_id: selectedUser.user_id, status: "bloqueado" }); setSelectedUser({ ...selectedUser, status: "bloqueado" }); }}
                        disabled={isFounder(selectedUser)}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Lock className="w-3 h-3" /> Bloquear
                      </button>
                    ) : (
                      <button
                        onClick={() => { updateStatus.mutate({ user_id: selectedUser.user_id, status: "ativo" }); setSelectedUser({ ...selectedUser, status: "ativo" }); }}
                        disabled={isFounder(selectedUser)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        <Unlock className="w-3 h-3" /> Desbloquear
                      </button>
                    )}
                    {!isFounder(selectedUser) && (
                      <button
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este usuário? Esta ação é irreversível.")) {
                            deleteUser.mutate({ user_id: selectedUser.user_id });
                            setSelectedUser(null);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 text-xs font-semibold hover:bg-red-900/30 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir Usuário
                      </button>
                    )}
                  </div>
                </div>

                {isFounder(selectedUser) && (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                    <p className="text-xs text-purple-300 font-semibold">👑 Conta Founder — protegida contra alterações</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminUsers;
