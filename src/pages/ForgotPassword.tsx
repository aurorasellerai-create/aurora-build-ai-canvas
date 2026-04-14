import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, ShieldAlert } from "lucide-react";
import AuthBackButton from "@/components/AuthBackButton";

const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 300; // 5 min

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);
  const { resetPassword } = useAuth();

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setError("");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLocked) {
      setError(`Aguarde ${countdown}s antes de tentar novamente.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_SECONDS * 1000);
        setError(`Muitas tentativas. Aguarde ${Math.floor(LOCKOUT_SECONDS / 60)} minutos.`);
        setLoading(false);
        return;
      }

      const { error } = await resetPassword(email);
      if (error) setError(error.message);
      else setSent(true);
    } catch {
      setError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <AuthBackButton to="/auth" label="Voltar ao login" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-aurora"
      >
        <h1 className="text-2xl font-display font-bold text-gradient-gold text-center mb-4">
          Recuperar senha
        </h1>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">Email enviado! Verifique sua caixa de entrada.</p>
            <Link to="/auth" className="text-secondary hover:underline text-sm">
              Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="Seu email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
            {isLocked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                <ShieldAlert className="w-5 h-5 text-destructive flex-shrink-0" />
                <p className="text-destructive text-sm font-medium">
                  Bloqueado por segurança. Aguarde {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                </p>
              </div>
            )}
            {error && !isLocked && <p className="text-destructive text-sm text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar link
            </button>
            <Link to="/auth" className="text-muted-foreground text-sm hover:text-foreground block text-center">
              Voltar ao login
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
