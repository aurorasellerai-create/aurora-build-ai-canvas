import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Crown, Zap, Bot, Smartphone,
  DollarSign, Wrench, Settings, ArrowLeft, Shield, Menu, X,
} from "lucide-react";

export type AdminSection =
  | "dashboard"
  | "users"
  | "plans"
  | "credits"
  | "ai_usage"
  | "apps"
  | "financial"
  | "tools"
  | "system";

const NAV_ITEMS: { id: AdminSection; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard Geral", icon: LayoutDashboard },
  { id: "users", label: "Usuários", icon: Users },
  { id: "plans", label: "Planos", icon: Crown },
  { id: "credits", label: "Créditos", icon: Zap },
  { id: "ai_usage", label: "Uso da IA", icon: Bot },
  { id: "apps", label: "Apps Gerados", icon: Smartphone },
  { id: "financial", label: "Financeiro", icon: DollarSign },
  { id: "tools", label: "Ferramentas", icon: Wrench },
  { id: "system", label: "Sistema", icon: Settings },
];

interface AdminLayoutProps {
  section: AdminSection;
  onSectionChange: (s: AdminSection) => void;
  children: React.ReactNode;
}

const AdminLayout = ({ section, onSectionChange, children }: AdminLayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          className="md:hidden text-muted-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <Shield className="w-5 h-5 text-primary" />
        <h1 className="font-display font-bold text-lg text-gradient-gold">Painel Admin</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-56 border-r border-border flex-col py-4 px-2 shrink-0 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                section === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Sidebar - Mobile Overlay */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-background border-r border-border py-16 px-3 md:hidden overflow-y-auto"
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSectionChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all mb-0.5 ${
                    section === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
