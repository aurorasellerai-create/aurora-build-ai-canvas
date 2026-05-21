import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Rocket, Smartphone,
  Brain, Package, Zap, History, Crown, Settings, ShieldAlert,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import AuroraLogo from "@/components/AuroraLogo";
import RoleBadge from "@/components/RoleBadge";
import { useRole } from "@/hooks/useRole";

type Item = { title: string; url: string; icon: any; hash?: string };

const overview: Item[] = [
  { title: "Visão Geral", url: "/dashboard", icon: LayoutDashboard },
  { title: "Criar App", url: "/generator", icon: Rocket },
  { title: "Meus Apps", url: "/dashboard#apps", icon: Smartphone },
];

const ai: Item[] = [
  { title: "Ferramentas IA", url: "/dashboard#ia", icon: Brain },
  { title: "Geração APK", url: "/dashboard#apk", icon: Package },
  { title: "Validador", url: "/dashboard#validador", icon: ShieldAlert },
];

const account: Item[] = [
  { title: "Créditos", url: "/credits", icon: Zap },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Planos", url: "/pricing", icon: Crown },
  { title: "Ferramentas", url: "/tools", icon: Settings },
];

const Section = ({ label, items }: { label: string; items: Item[] }) => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname, hash } = useLocation();
  const fullPath = pathname + hash;

  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-bold">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = item.url.includes("#")
              ? fullPath === item.url
              : pathname === item.url && !hash;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active} className="group">
                  <NavLink
                    to={item.url}
                    className={`flex items-center gap-3 rounded-lg transition-all ${
                      active
                        ? "bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.25)]"
                        : "hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 transition-colors ${active ? "text-primary" : "text-muted-foreground group-hover:text-secondary"}`} />
                    {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
};

export const DashboardSidebar = () => {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isPrivileged } = useRole();

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 py-4">
        <NavLink to="/" className="flex items-center gap-2 px-2">
          <AuroraLogo className="w-7 h-7" />
          {!collapsed && (
            <span className="font-display font-bold text-sm text-gradient-gold">
              Aurora Build
            </span>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <Section label="Principal" items={overview} />
        <Section label="IA & Build" items={ai} />
        <Section label="Conta" items={account} />
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center justify-center">
            <RoleBadge />
          </div>
        )}
        {!collapsed && !isPrivileged && (
          <div className="rounded-lg p-3 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-primary font-bold mb-1">PRO</p>
            <p className="text-xs text-foreground/80 leading-snug">Mais builds, IA ilimitada e publicação automática.</p>
            <NavLink
              to="/pricing"
              className="mt-2 inline-block text-[11px] font-bold text-primary hover:underline"
            >
              Fazer upgrade →
            </NavLink>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};

export default DashboardSidebar;
