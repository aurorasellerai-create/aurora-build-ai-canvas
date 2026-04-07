import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User } from "lucide-react";
import AuthBackButton from "@/components/AuthBackButton";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

  useEffect(() => {
    if (referralCode) setIsLogin(false);
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/dashboard");
    } else {
      const { error } = await signUp(email, password, displayName, referralCode || undefined);
      if (error) setError(error.message);
      else setMessage("Cadastro realizado! Verifique seu email para confirmar.");
    }
    setLoading(false);
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

          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          {message && <p className="text-secondary text-sm text-center">{message}</p>}

          <button
            type="submit"
            disabled={loading}
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
