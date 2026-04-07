import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, History, Zap } from "lucide-react";

export default function CreditHistoryWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: purchases = [] } = useQuery({
    queryKey: ["credit-purchases-recent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_purchases")
        .select("id, package_name, credits_amount, status, created_at")
        .eq("user_id", user!.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: usage = [] } = useQuery({
    queryKey: ["credit-usage-recent", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_usage")
        .select("id, action, credits_used, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Realtime subscriptions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("credit-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "credit_purchases" }, () => {
        queryClient.invalidateQueries({ queryKey: ["credit-purchases-recent"] });
        queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "credit_usage" }, () => {
        queryClient.invalidateQueries({ queryKey: ["credit-usage-recent"] });
        queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Merge and sort by date
  const combined = [
    ...purchases.map((p) => ({
      id: p.id,
      type: "purchase" as const,
      label: p.package_name,
      amount: p.credits_amount,
      date: p.created_at,
    })),
    ...usage.map((u) => ({
      id: u.id,
      type: "usage" as const,
      label: u.action.replace(/_/g, " "),
      amount: u.credits_used,
      date: u.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  if (combined.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="card-aurora mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Histórico de créditos
        </h2>
        <Link to="/credits" className="text-xs text-primary hover:underline font-semibold">
          Ver tudo →
        </Link>
      </div>

      <div className="space-y-2">
        {combined.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
          >
            <div className="flex items-center gap-3">
              {item.type === "purchase" ? (
                <ArrowDownLeft className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <ArrowUpRight className="w-4 h-4 text-destructive shrink-0" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground capitalize">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(item.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <span
              className={`text-sm font-bold ${
                item.type === "purchase" ? "text-primary" : "text-destructive"
              }`}
            >
              {item.type === "purchase" ? "+" : "-"}{item.amount}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
