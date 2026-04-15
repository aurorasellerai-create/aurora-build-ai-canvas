import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import auroraSymbol from "@/assets/aurora-symbol.png";

const navLinks = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Preços", href: "#precos" },
  { label: "IA", href: "#ia" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { canInstall, install } = useInstallPrompt();

  const scrollTo = (hash: string) => {
    setOpen(false);
    const el = document.querySelector(hash);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group transition-transform duration-300 hover:scale-105">
          <img src={auroraSymbol} alt="Aurora Build AI" width={34} height={34} className="w-[34px] h-[34px] object-contain transition-all duration-300" />
          <span className="font-display font-bold text-sm md:text-base tracking-wide hidden sm:inline">
            <span className="text-foreground">Aurora </span>
            <span className="bg-gradient-to-r from-secondary to-[hsl(210,100%,60%)] bg-clip-text text-transparent">Build AI</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          {canInstall && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-display font-semibold rounded-lg border border-secondary/50 text-secondary hover:bg-secondary/10 transition-all"
            >
              <Download size={15} />
              Instalar
            </button>
          )}
          {user ? (
            <Link
              to="/dashboard"
              onMouseEnter={() => import("@/pages/Dashboard")}
              className="px-5 py-2 text-sm font-display font-bold rounded-lg bg-primary text-primary-foreground glow-gold hover:scale-[1.03] transition-transform"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              onMouseEnter={() => import("@/pages/Auth")}
              className="px-5 py-2 text-sm font-display font-bold rounded-lg bg-primary text-primary-foreground glow-gold hover:scale-[1.03] transition-transform"
            >
              Entrar
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
          aria-label="Menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md px-5 pb-5 pt-3 space-y-3">
          {navLinks.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="block w-full text-left text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              {l.label}
            </button>
          ))}
          {canInstall && (
            <button
              onClick={() => { setOpen(false); install(); }}
              className="flex items-center justify-center gap-1.5 w-full px-5 py-2.5 text-sm font-display font-semibold rounded-lg border border-secondary/50 text-secondary hover:bg-secondary/10 transition-all"
            >
              <Download size={15} />
              Instalar App
            </button>
          )}
          <Link
            to={user ? "/dashboard" : "/auth"}
            onClick={() => setOpen(false)}
            className="block w-full text-center px-5 py-2.5 text-sm font-display font-bold rounded-lg bg-primary text-primary-foreground glow-gold"
          >
            {user ? "Dashboard" : "Entrar"}
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
