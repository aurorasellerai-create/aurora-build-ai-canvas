import { ReactNode, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Shield, Loader2, Lock, Mail, ShieldAlert, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

const PROTECTED_ADMIN_EMAILS = [
  "aurora.seller.ai@gmail.com",
  "dayse74correia@hotmail.com",
];

const isProtectedAdminEmail = (email?: string | null) =>
  !!email && PROTECTED_ADMIN_EMAILS.includes(email.toLowerCase());

interface AdminPinGateProps {
  children: ReactNode;
}

const AdminLoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("secure-login", {
        body: { email, password },
      });

      if (fnError || data?.error) {
        setError(data?.error || fnError?.message || "Credenciais inválidas");
      } else if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        // Session set triggers onAuthStateChange → AdminPinGate re-renders automatically
      }
    } catch {
      setError("Erro interno. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm card-aurora p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold text-gradient-gold">Admin Login</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email administrativo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <ShieldAlert className="w-4 h-4 text-destructive flex-shrink-0" />
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Acessar Painel
          </button>
        </form>

        <p className="text-center text-muted-foreground text-xs mt-4">
          Acesso restrito a administradores autorizados.
        </p>
      </div>
    </div>
  );
};

const AdminPinGate = ({ children }: AdminPinGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const isProtectedAdmin = isProtectedAdminEmail(user?.email);

  const {
    data: isAdmin,
    isLoading: checkingRole,
    isFetched,
  } = useQuery({
    queryKey: ["admin-role-gate", user?.id],
    queryFn: async () => {
      const [{ data: isAdminRole }, { data: isFounderRole }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" as any }),
        supabase.rpc("has_role", { _user_id: user!.id, _role: "founder" as any }),
      ]);
      return !!isAdminRole || !!isFounderRole || isProtectedAdminEmail(user?.email);
    },
    enabled: !!user && !authLoading,
    retry: 2,
    staleTime: 30_000,
  });

  // Auth still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // No user → show admin login form (NOT redirect to /auth)
  if (!user) {
    return <AdminLoginForm />;
  }

  // Role check in progress
  if (checkingRole || !isFetched) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin && !isProtectedAdmin) {
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
