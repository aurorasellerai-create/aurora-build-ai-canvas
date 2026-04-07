import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useState, useCallback } from "react";

export type PaywallFeature =
  | "second_app"
  | "advanced_ai"
  | "translation"
  | "viral_system"
  | "publish"
  | "premium_format";

const featureLabels: Record<PaywallFeature, { title: string; trigger: string }> = {
  second_app: {
    title: "Criar mais apps",
    trigger: "🔥 Recurso mais usado por quem já está faturando",
  },
  advanced_ai: {
    title: "IA Avançada",
    trigger: "🚀 Usuários PRO criam até 5x mais rápido",
  },
  translation: {
    title: "Tradução Automática",
    trigger: "💰 Apps completos geram mais resultados",
  },
  viral_system: {
    title: "Sistema Viral",
    trigger: "🚀 Comece a escalar seu negócio hoje",
  },
  publish: {
    title: "Publicar App",
    trigger: "💰 Apps publicados geram receita real",
  },
  premium_format: {
    title: "Formatos Premium",
    trigger: "🔥 Recurso mais usado por quem já está faturando",
  },
};

export function usePaywall() {
  const { user } = useAuth();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<PaywallFeature>("second_app");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("plan, daily_builds_count, last_build_date")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: projectCount = 0 } = useQuery({
    queryKey: ["project-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const plan = profile?.plan || "free";
  const isFree = plan === "free";
  const isPro = plan === "pro";

  const checkAccess = useCallback(
    (feature: PaywallFeature): boolean => {
      let blocked = false;

      switch (feature) {
        case "second_app":
          blocked = isFree && projectCount >= 1;
          break;
        case "advanced_ai":
          blocked = isFree;
          break;
        case "translation":
          blocked = isFree || isPro;
          break;
        case "viral_system":
          blocked = isFree;
          break;
        case "publish":
          blocked = isFree;
          break;
        case "premium_format":
          blocked = isFree || isPro;
          break;
      }

      if (blocked) {
        setPaywallFeature(feature);
        setPaywallOpen(true);
        return false;
      }
      return true;
    },
    [isFree, isPro, projectCount]
  );

  return {
    plan,
    isFree,
    isPro,
    paywallOpen,
    setPaywallOpen,
    paywallFeature,
    checkAccess,
    featureLabels,
    projectCount,
  };
}
