import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User, ShieldAlert } from "lucide-react";
import AuthBackButton from "@/components/AuthBackButton";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";

const MAX_CLIENT_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const source = searchParams.get("source");
  const previewSlug = searchParams.get("preview");
  const previewOrigin = searchParams.get("origin");

  useEffect(() => {
    if (referralCode) setIsLogin(false);
  }, [referralCode]);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setError("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (isLocked) {
      setError(`Muitas tentativas. Aguarde ${lockCountdown}s.`);
      return;
    }

    setLoading(true);
    analytics.authNextStepConfirmed(isLogin ? "login" : "signup", source, previewSlug, previewOrigin);

    try {
      if (isLogin) {
        // Use secure-login Edge Function (server-side rate limiting)
        const { data, error: fnError } = await supabase.functions.invoke("secure-login", {
          body: { email, password },
        });

        if (fnError || data?.error) {
          const errMsg = data?.error || fnError?.message || "Erro ao fazer login";
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);

          if (data?.locked || newAttempts >= MAX_CLIENT_ATTEMPTS) {
            const mins = data?.lockout_minutes || LOCKOUT_MINUTES;
            setLockedUntil(Date.now() + mins * 60 * 1000);
            setError(`Conta bloqueada por segurança. Aguarde ${mins} minutos.`);
          } else {
            const remaining = data?.remaining_attempts ?? (MAX_CLIENT_ATTEMPTS - newAttempts);
            setError(`${errMsg} (${remaining} tentativa${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""})`);
          }
        } else if (data?.session) {
          // Set the session from the Edge Function response
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          setFailedAttempts(0);
          navigate("/dashboard");
        }
      } else {
        const { error } = await signUp(email, password, displayName, referralCode || undefined);
        if (error) setError(error.message);
        else {
          setMessage("Conta criada com sucesso! Redirecionando...");
          setTimeout(() => navigate("/dashboard"), 1500);
        }
      }
    } catch (err) {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <AuthBackButton to="/" label="Voltar para início" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-aurora"
      >
        <h1 className="text-2xl font-display font-bold text-gradient-gold text-center mb-8">
          {isLogin ? "Entrar" : "Criar conta"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Seu nome"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email"
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

          {isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-destructive text-sm font-medium">
                Bloqueado por segurança. Aguarde {Math.floor(lockCountdown / 60)}:{String(lockCountdown % 60).padStart(2, "0")}
              </p>
            </div>
          )}
          {error && !isLocked && <p className="text-destructive text-sm text-center">{error}</p>}
          {message && <p className="text-secondary text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {isLogin && (
            <Link to="/forgot-password" className="text-secondary text-sm hover:underline block">
              Esqueceu a senha?
            </Link>
          )}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
            className="text-muted-foreground text-sm hover:text-foreground transition-colors"
          >
            {isLogin ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
