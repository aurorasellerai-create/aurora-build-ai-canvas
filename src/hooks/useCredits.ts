import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

const ACTION_COSTS: Record<string, number> = {
  generate_app: 3,
  generate_business: 2,
  ai_tool_names: 1,
  ai_tool_ideas: 1,
  ai_tool_description: 1,
  ai_tool_icon: 1,
  ai_tool_splash: 1,
  ai_video_5s: 10,
  ai_video_10s: 20,
  ai_video_15s: 30,
  ai_video_30s: 60,
  ai_video_continue: 30,
  ai_carousel: 5,
  convert_aab: 100,
};

export function useCredits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isAdmin = false } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      return !!data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
  });

  const { data: balance = 0 } = useQuery({
    queryKey: ["credits-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", user!.id)
        .single();
      return data?.credits_balance ?? 0;
    },
    enabled: !!user,
  });

  const consumeCredits = useCallback(
    async (action: string, customAmount?: number): Promise<boolean> => {
      if (!user) return false;
      if (isAdmin) return true;

      const amount = customAmount ?? ACTION_COSTS[action] ?? 1;

      if (balance < amount) {
        toast({
          title: "Créditos insuficientes",
          description: `Esta ação custa ${amount} crédito(s). Você tem ${balance}. Compre mais créditos.`,
          variant: "destructive",
        });
        return false;
      }

      const { data: success, error } = await supabase.rpc("consume_credits", {
        p_user_id: user.id,
        p_action: action,
        p_amount: amount,
      });

      if (error || !success) {
        toast({
          title: "Créditos insuficientes",
          description: "Compre mais créditos para continuar usando a IA.",
          variant: "destructive",
        });
        return false;
      }

      // Refresh balance across the app
      queryClient.invalidateQueries({ queryKey: ["credits-balance"] });
      queryClient.invalidateQueries({ queryKey: ["profile-credits"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["credit-usage"] });

      return true;
    },
    [user, isAdmin, balance, queryClient]
  );

  const getCost = (action: string) => isAdmin ? 0 : (ACTION_COSTS[action] ?? 1);
  const displayBalance = isAdmin ? 9999 : balance;

  return { balance: displayBalance, consumeCredits, getCost, ACTION_COSTS, isAdmin };
}
