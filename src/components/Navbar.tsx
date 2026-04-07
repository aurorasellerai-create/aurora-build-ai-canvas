import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import auroraLogo from "@/assets/aurora-hero.jpeg";

const navLinks = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Preços", href: "#precos" },
  { label: "IA", href: "#ia" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const scrollTo = (hash: string) => {
    setOpen(false);
    const el = document.querySelector(hash);
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={auroraLogo}
            alt="Aurora Build AI"
            className="h-9 md:h-11 w-auto rounded-md object-cover transition-all duration-300 group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.5)]"
          />
          <span className="font-display font-bold text-base md:text-lg tracking-wide text-foreground transition-colors group-hover:text-primary">
            Aurora<span className="text-primary"> Build AI</span>
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
          {user ? (
            <Link
              to="/dashboard"
              className="px-5 py-2 text-sm font-display font-bold rounded-lg bg-primary text-primary-foreground glow-gold hover:scale-[1.03] transition-transform"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
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
