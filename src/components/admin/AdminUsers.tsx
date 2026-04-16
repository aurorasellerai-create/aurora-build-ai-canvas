import { useState, useMemo, useCallback } from "react";
import { Search, Loader2, Crown, User, ShieldCheck, ShieldOff, Eye, X, Send, Lock, Unlock, Trash2, Clock, ChevronDown, ChevronLeft, ChevronRight, MoreHorizontal, Download, Mail, CheckSquare, AlertTriangle } from "lucide-react";
import { useAdminUsers, useUpdatePlan, useUpdateCredits, useToggleAdmin, useUpdateTipo, useUpdateStatus, useExtendTrial, useDeleteUser } from "./useAdminData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

type FilterType = "all" | "vip" | "cliente" | "premium" | "teste";

const PROTECTED_ADMIN_EMAILS = [
  "aurora.seller.ai@gmail.com",
  "dayse74correia@hotmail.com",
];

const isProtectedAdminEmail = (email?: string | null) =>
  !!email && PROTECTED_ADMIN_EMAILS.includes(email.toLowerCase());

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

// CSV Export helper
const exportToCSV = (data: UserDetail[], filename: string) => {
  const headers = ["Nome", "Email", "Tipo Usuário", "Plano", "Status", "Teste Expira Em", "Data Criação", "Créditos"];
  const rows = data.map(u => [
    u.display_name || "—",
    u.email || "—",
    u.tipo_usuario,
    u.plan,
    u.status,
    u.teste_expira_em ? new Date(u.teste_expira_em).toLocaleDateString("pt-BR") : "—",
    new Date(u.created_at).toLocaleDateString("pt-BR"),
    String(u.credits_balance),
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast({ title: "📥 Download iniciado", description: `${data.length} usuário(s) exportados` });
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
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Email modal state
  const [emailModal, setEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailTarget, setEmailTarget] = useState<"selected" | "all" | "vip" | "cliente">("selected");
  const [emailSending, setEmailSending] = useState(false);

  // Bulk action confirm
  const [bulkConfirm, setBulkConfirm] = useState<{ action: string; label: string } | null>(null);

  const filtered = useMemo(() => users
    .filter((u: any) => {
      if (filter === "vip") return u.tipo_usuario === "vip";
      if (filter === "cliente") return u.tipo_usuario === "cliente";
      if (filter === "premium") return u.plan === "premium";
      if (filter === "teste") return !!u.teste_expira_em;
      return true;
    })
    .filter(
      (u: any) =>
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.display_name?.toLowerCase().includes(search.toLowerCase())
    ), [users, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleFilterChange = (f: FilterType) => { setFilter(f); setPage(1); };
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1); };

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
  const isProtectedPrincipal = (u: any) => isProtectedAdminEmail(u.email);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((u: any) => u.user_id)));
    }
  };

  const selectedUsers = useMemo(() =>
    users.filter((u: any) => selectedIds.has(u.user_id)),
    [users, selectedIds]
  );

  // Bulk actions
  const executeBulkAction = useCallback(async (action: string) => {
    const targets = selectedUsers.filter((u: any) => {
      if (["bloquear", "excluir"].includes(action)) return !isProtectedPrincipal(u);
      return true;
    });
    if (targets.length === 0) {
      toast({ title: "Nenhum usuário elegível para esta ação", variant: "destructive" });
      return;
    }

    for (const u of targets) {
      switch (action) {
        case "vip": updateTipo.mutate({ user_id: u.user_id, tipo_usuario: "vip" }); break;
        case "cliente": updateTipo.mutate({ user_id: u.user_id, tipo_usuario: "cliente" }); break;
        case "free": updatePlan.mutate({ user_id: u.user_id, plan: "free" }); break;
        case "bloquear": updateStatus.mutate({ user_id: u.user_id, status: "bloqueado" }); break;
        case "excluir": deleteUser.mutate({ user_id: u.user_id }); break;
      }
    }

    toast({ title: `✅ Ação aplicada a ${targets.length} usuário(s)` });
    setSelectedIds(new Set());
    setBulkConfirm(null);
  }, [selectedUsers, updateTipo, updatePlan, updateStatus, deleteUser]);

  // Export by filter
  const handleExport = (type?: string) => {
    let data: UserDetail[] = [];
    let label = "todos";
    switch (type || filter) {
      case "vip": data = users.filter((u: any) => u.tipo_usuario === "vip"); label = "vip"; break;
      case "cliente": data = users.filter((u: any) => u.tipo_usuario === "cliente"); label = "clientes"; break;
      case "premium": data = users.filter((u: any) => u.plan === "premium"); label = "premium"; break;
      case "teste": data = users.filter((u: any) => !!u.teste_expira_em); label = "teste"; break;
      default: data = users; label = "todos"; break;
    }
    exportToCSV(data, `usuarios_${label}_${new Date().toISOString().split("T")[0]}`);
  };

  // Email recipients resolver
  const getEmailRecipients = (): UserDetail[] => {
    switch (emailTarget) {
      case "selected": return selectedUsers;
      case "vip": return users.filter((u: any) => u.tipo_usuario === "vip");
      case "cliente": return users.filter((u: any) => u.tipo_usuario === "cliente");
      default: return users;
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      toast({ title: "Preencha assunto e mensagem", variant: "destructive" });
      return;
    }
    const recipients = getEmailRecipients();
    if (recipients.length === 0) {
      toast({ title: "Nenhum destinatário", variant: "destructive" });
      return;
    }
    setEmailSending(true);
    // Simulate / placeholder for future email edge function
    await new Promise(r => setTimeout(r, 1500));
    toast({ title: `📧 Email preparado para ${recipients.length} destinatário(s)`, description: "Estrutura pronta para integração com serviço de email" });
    setEmailSending(false);
    setEmailModal(false);
    setEmailSubject("");
    setEmailMessage("");
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const vipCount = users.filter((u: any) => u.tipo_usuario === "vip").length;
  const clienteCount = users.filter((u: any) => u.tipo_usuario === "cliente").length;
  const premiumCount = users.filter((u: any) => u.plan === "premium").length;
  const testeCount = users.filter((u: any) => !!u.teste_expira_em).length;
  const expiringUsers = users.filter((u: any) => {
    const days = getTrialDaysLeft(u.teste_expira_em);
    return days !== null && days > 0 && days <= 3;
  });

  const statsCards = [
    { label: "Total", value: users.length, icon: "📊", filterKey: "all" as FilterType },
    { label: "VIP", value: vipCount, icon: "👑", filterKey: "vip" as FilterType },
    { label: "Clientes", value: clienteCount, icon: "👤", filterKey: "cliente" as FilterType },
    { label: "Premium", value: premiumCount, icon: "⭐", filterKey: "premium" as FilterType },
    { label: "Teste", value: testeCount, icon: "⏳", filterKey: "teste" as FilterType },
  ];

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-display font-bold text-foreground text-lg">Usuários do Sistema ({users.length})</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar nome ou email..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
            />
          </div>
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

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {statsCards.map((s) => (
          <button
            key={s.label}
            onClick={() => handleFilterChange(s.filterKey)}
            className={`card-aurora p-3 text-center transition-all cursor-pointer ${filter === s.filterKey ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50"}`}
          >
            <p className="text-lg font-display font-bold text-foreground">{s.icon} {s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Action bar: filters + export + bulk + email */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Filters */}
        {[
          { key: "all" as FilterType, label: "Todos", count: users.length },
          { key: "vip" as FilterType, label: "👑 VIP", count: vipCount },
          { key: "cliente" as FilterType, label: "👤 Clientes", count: clienteCount },
          { key: "premium" as FilterType, label: "⭐ Premium", count: premiumCount },
          { key: "teste" as FilterType, label: "⏳ Teste", count: testeCount },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}

        <div className="flex-1" />

        {/* Export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1">
            <Download className="w-3.5 h-3.5" /> Exportar CSV
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => handleExport()}>
              📥 Filtro ativo ({filter === "all" ? "Todos" : filter.toUpperCase()})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport("all")}>📊 Todos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("vip")}>👑 VIP</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("cliente")}>👤 Clientes</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("premium")}>⭐ Premium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("teste")}>⏳ Teste</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Email button */}
        <button
          onClick={() => setEmailModal(true)}
          className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center gap-1"
        >
          <Mail className="w-3.5 h-3.5" /> Enviar Email
        </button>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1">
              <CheckSquare className="w-3.5 h-3.5" /> Ações em massa ({selectedIds.size})
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => setBulkConfirm({ action: "vip", label: "Tornar VIP" })}>
                <Crown className="w-3 h-3 mr-2 text-amber-400" /> Tornar VIP
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ action: "cliente", label: "Tornar Cliente" })}>
                <User className="w-3 h-3 mr-2" /> Tornar Cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ action: "free", label: "Rebaixar para Free" })}>
                <ChevronDown className="w-3 h-3 mr-2" /> Rebaixar → Free
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setBulkConfirm({ action: "bloquear", label: "Bloquear acesso" })} className="text-amber-500">
                <Lock className="w-3 h-3 mr-2" /> Bloquear acesso
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkConfirm({ action: "excluir", label: "Excluir usuários" })} className="text-destructive">
                <Trash2 className="w-3 h-3 mr-2" /> Excluir usuários
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setEmailTarget("selected"); setEmailModal(true); }}>
                <Mail className="w-3 h-3 mr-2 text-blue-400" /> Enviar email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-3 py-3 w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className="mx-auto"
                />
              </th>
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
            {paginated.map((u: any) => {
              const daysLeft = getTrialDaysLeft(u.teste_expira_em);
              const founder = isFounder(u);
              const protectedPrincipal = isProtectedPrincipal(u);
              const isSelected = selectedIds.has(u.user_id);
              return (
                <tr key={u.user_id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${u.status === "bloqueado" ? "opacity-60" : ""} ${founder ? "bg-purple-500/5" : ""} ${isSelected ? "bg-primary/5" : ""}`}>
                  <td className="px-3 py-3 text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(u.user_id)}
                    />
                  </td>
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
                            {u.access_role !== "admin" && (
                              <DropdownMenuItem onClick={() => toggleAdmin.mutate({ user_id: u.user_id, makeAdmin: true })}>
                                <ShieldCheck className="w-3 h-3 mr-2 text-blue-400" /> Tornar Admin
                              </DropdownMenuItem>
                            )}
                            {(u.access_role === "admin" || u.access_role === "founder") && !protectedPrincipal && (
                              <DropdownMenuItem onClick={() => toggleAdmin.mutate({ user_id: u.user_id, makeAdmin: false })}>
                                <ShieldOff className="w-3 h-3 mr-2" /> Remover Admin/Founder
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updatePlan.mutate({ user_id: u.user_id, plan: "free" })}>
                              <ChevronDown className="w-3 h-3 mr-2" /> Rebaixar → Free
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.status === "ativo" && !protectedPrincipal ? (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ user_id: u.user_id, status: "bloqueado" })} className="text-destructive">
                                <Lock className="w-3 h-3 mr-2" /> Bloquear
                              </DropdownMenuItem>
                            ) : u.status !== "ativo" ? (
                              <DropdownMenuItem onClick={() => updateStatus.mutate({ user_id: u.user_id, status: "ativo" })}>
                                <Unlock className="w-3 h-3 mr-2 text-emerald-400" /> Desbloquear
                              </DropdownMenuItem>
                            ) : null}
                            {!protectedPrincipal && <DropdownMenuItem
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir este usuário?")) {
                                  deleteUser.mutate({ user_id: u.user_id });
                                }
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3 h-3 mr-2" /> Excluir
                            </DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Mostrando {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-muted-foreground px-1">…</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                      p === currentPage ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Confirm Modal */}
      <AnimatePresence>
        {bulkConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setBulkConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground">Confirmar ação em massa</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Tem certeza que deseja <strong>{bulkConfirm.label}</strong> para <strong>{selectedIds.size}</strong> usuário(s) selecionado(s)?
                {bulkConfirm.action === "excluir" && <span className="block mt-2 text-destructive font-semibold">⚠️ Esta ação é irreversível!</span>}
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setBulkConfirm(null)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/80 transition-colors">
                  Cancelar
                </button>
                <button
                  onClick={() => executeBulkAction(bulkConfirm.action)}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                    bulkConfirm.action === "excluir" ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Email Modal */}
      <AnimatePresence>
        {emailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-400" /> Enviar Email
                </h3>
                <button onClick={() => setEmailModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Target */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold mb-1 block">Destinatários</label>
                  <Select value={emailTarget} onValueChange={(v: any) => setEmailTarget(v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="selected">✅ Selecionados ({selectedIds.size})</SelectItem>
                      <SelectItem value="all">📊 Todos ({users.length})</SelectItem>
                      <SelectItem value="vip">👑 VIP ({vipCount})</SelectItem>
                      <SelectItem value="cliente">👤 Clientes ({clienteCount})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold mb-1 block">Assunto</label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Assunto do email..."
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs text-muted-foreground uppercase font-semibold mb-1 block">Mensagem</label>
                  <textarea
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    placeholder="Escreva sua mensagem..."
                    rows={5}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
                  📌 <strong>Base para automação futura:</strong> Este módulo está preparado para integração com serviço de email (campanhas, avisos de expiração, upgrades).
                </div>

                <div className="flex justify-end gap-2">
                  <button onClick={() => setEmailModal(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-semibold hover:bg-muted/80 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {emailSending ? "Enviando..." : `Enviar (${getEmailRecipients().length})`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

                {/* Editable: Tipo, Acesso, Plano */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">✏️ Editar Usuário</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">Tipo</label>
                      <Select
                        value={selectedUser.tipo_usuario}
                        onValueChange={(val) => {
                          updateTipo.mutate({ user_id: selectedUser.user_id, tipo_usuario: val });
                          setSelectedUser({ ...selectedUser, tipo_usuario: val });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cliente">👤 Cliente</SelectItem>
                          <SelectItem value="vip">👑 VIP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">Acesso</label>
                      <Select
                        value={selectedUser.access_role}
                        onValueChange={(val) => {
                          if (isProtectedAdminEmail(selectedUser.email) && val !== selectedUser.access_role) {
                            toast({ title: "Acesso administrativo protegido", variant: "destructive" });
                            return;
                          }
                          if (val === "admin") {
                            toggleAdmin.mutate({ user_id: selectedUser.user_id, makeAdmin: true });
                          } else {
                            toggleAdmin.mutate({ user_id: selectedUser.user_id, makeAdmin: false });
                          }
                          setSelectedUser({ ...selectedUser, access_role: val });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">👤 User</SelectItem>
                          <SelectItem value="admin">🛠️ Admin</SelectItem>
                          {selectedUser.access_role === "founder" && <SelectItem value="founder">👑 Founder</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase font-semibold mb-1 block">Plano</label>
                      <Select
                        value={selectedUser.plan}
                        onValueChange={(val) => {
                          updatePlan.mutate({ user_id: selectedUser.user_id, plan: val });
                          setSelectedUser({ ...selectedUser, plan: val });
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
                      className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Estender
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase font-semibold">Ações Rápidas</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.status === "ativo" && !isProtectedAdminEmail(selectedUser.email) ? (
                      <button
                        onClick={() => { updateStatus.mutate({ user_id: selectedUser.user_id, status: "bloqueado" }); setSelectedUser({ ...selectedUser, status: "bloqueado" }); }}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" /> Bloquear
                      </button>
                    ) : selectedUser.status !== "ativo" ? (
                      <button
                        onClick={() => { updateStatus.mutate({ user_id: selectedUser.user_id, status: "ativo" }); setSelectedUser({ ...selectedUser, status: "ativo" }); }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" /> Desbloquear
                      </button>
                    ) : null}
                    {!isProtectedAdminEmail(selectedUser.email) && <button
                      onClick={() => {
                        if (confirm("Tem certeza que deseja excluir este usuário? Esta ação é irreversível.")) {
                          deleteUser.mutate({ user_id: selectedUser.user_id });
                          setSelectedUser(null);
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 text-xs font-semibold hover:bg-red-900/30 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Excluir Usuário
                    </button>}
                  </div>
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
