import { useState } from "react";
import { Search, Loader2, Plus, Minus, ShieldCheck } from "lucide-react";
import { useAdminUsers, useUpdatePlan, useUpdateCredits } from "./useAdminData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const AdminUsers = ({ enabled }: { enabled: boolean }) => {
  const { data: users = [], isLoading } = useAdminUsers(enabled);
  const updatePlan = useUpdatePlan();
  const updateCredits = useUpdateCredits();
  const [search, setSearch] = useState("");
  const [creditInput, setCreditInput] = useState<Record<string, string>>({});

  const filtered = users.filter(
    (u: any) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCredits = (userId: string, amount: number) => {
    updateCredits.mutate({ user_id: userId, amount });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-foreground text-lg">Usuários ({users.length})</h2>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
          />
        </div>
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
                    <button onClick={() => handleCredits(u.user_id, -10)} className="p-1 rounded hover:bg-muted transition-colors"><Minus className="w-3 h-3 text-muted-foreground" /></button>
                    <span className="text-foreground font-medium w-10 text-center">{u.credits_balance}</span>
                    <button onClick={() => handleCredits(u.user_id, 10)} className="p-1 rounded hover:bg-muted transition-colors"><Plus className="w-3 h-3 text-muted-foreground" /></button>
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">{u.completed_projects}/{u.total_projects}</td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
