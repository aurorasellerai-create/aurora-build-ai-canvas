import { useState, useEffect } from "react";
import { Shield, Lock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const ADMIN_PIN = "123456";
const STORAGE_KEY = "admin_auth";
const LOCKOUT_KEY = "admin_lockout";
const ATTEMPTS_KEY = "admin_attempts";
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000;

interface AdminPinGateProps {
  children: React.ReactNode;
}

const AdminPinGate = ({ children }: AdminPinGateProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setAuthenticated(true);
    checkLockout();
    setChecking(false);
  }, []);

  useEffect(() => {
    if (!locked) return;
    const interval = setInterval(() => {
      checkLockout();
    }, 1000);
    return () => clearInterval(interval);
  }, [locked]);

  const checkLockout = () => {
    const lockUntil = localStorage.getItem(LOCKOUT_KEY);
    if (lockUntil) {
      const remaining = parseInt(lockUntil) - Date.now();
      if (remaining > 0) {
        setLocked(true);
        setLockRemaining(Math.ceil(remaining / 1000));
      } else {
        setLocked(false);
        setLockRemaining(0);
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPTS_KEY);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;

    if (pin === ADMIN_PIN) {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
      setAuthenticated(true);
      setError("");
    } else {
      const attempts = parseInt(localStorage.getItem(ATTEMPTS_KEY) || "0") + 1;
      localStorage.setItem(ATTEMPTS_KEY, String(attempts));

      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = Date.now() + LOCKOUT_DURATION_MS;
        localStorage.setItem(LOCKOUT_KEY, String(lockUntil));
        setLocked(true);
        setLockRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
        setError(`Muitas tentativas. Bloqueado por 5 minutos.`);
      } else {
        setError(`Senha incorreta (${MAX_ATTEMPTS - attempts} tentativas restantes)`);
      }
      setPin("");
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  const minutes = Math.floor(lockRemaining / 60);
  const seconds = lockRemaining % 60;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="card-aurora rounded-2xl p-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>

          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Painel Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Aurora Control Center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setPin(val);
                  setError("");
                }}
                placeholder="••••••"
                disabled={locked}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted border border-border text-foreground text-center text-lg tracking-[0.5em] font-mono placeholder:tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                autoFocus
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-destructive text-sm font-medium"
              >
                {error}
              </motion.p>
            )}

            {locked && (
              <p className="text-amber-400 text-xs">
                Tente novamente em {minutes}:{String(seconds).padStart(2, "0")}
              </p>
            )}

            <button
              type="submit"
              disabled={pin.length < 6 || locked}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Entrar
            </button>
          </form>

          <p className="text-xs text-muted-foreground">Acesso restrito a administradores</p>
        </div>
      </motion.div>
    </div>
  );
};

export const adminLogout = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};

export default AdminPinGate;
