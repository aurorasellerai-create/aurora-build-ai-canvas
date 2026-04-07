import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Lock } from "lucide-react";
import AuthBackButton from "@/components/AuthBackButton";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else navigate("/dashboard");
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Link inválido ou expirado.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      <AuthBackButton to="/auth" label="Voltar ao login" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card-aurora"
      >
        <h1 className="text-2xl font-display font-bold text-gradient-gold text-center mb-4">
          Nova senha
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Nova senha (mín. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
            />
          </div>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Atualizar senha
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
