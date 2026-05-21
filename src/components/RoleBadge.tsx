import { Crown, Shield, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/hooks/useRole";
import { useSubscription } from "@/hooks/useSubscription";

interface RoleBadgeProps {
  className?: string;
  compact?: boolean;
}

/**
 * Renders the highest applicable badge for the current user:
 *   Founder > Super Admin > Admin > Premium > Pro
 * Returns null on the Free tier.
 */
const RoleBadge = ({ className, compact = false }: RoleBadgeProps) => {
  const { isFounder, isSuperAdmin, isAdmin } = useRole();
  const { isPremium, isPro } = useSubscription();

  const tier = isFounder
    ? { label: "Founder", icon: Crown, gradient: "from-amber-400 via-yellow-300 to-amber-500", text: "text-amber-950" }
    : isSuperAdmin
    ? { label: "Super Admin", icon: Sparkles, gradient: "from-fuchsia-500 via-purple-500 to-indigo-500", text: "text-white" }
    : isAdmin
    ? { label: "Admin", icon: Shield, gradient: "from-cyan-400 via-sky-500 to-blue-600", text: "text-white" }
    : isPremium
    ? { label: "Premium", icon: Crown, gradient: "from-yellow-400 to-amber-600", text: "text-amber-950" }
    : isPro
    ? { label: "Pro", icon: Star, gradient: "from-primary to-secondary", text: "text-primary-foreground" }
    : null;

  if (!tier) return null;
  const Icon = tier.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold tracking-wide shadow-sm",
        "bg-gradient-to-r",
        tier.gradient,
        tier.text,
        compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className,
      )}
    >
      <Icon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
      {tier.label}
    </span>
  );
};

export default RoleBadge;
