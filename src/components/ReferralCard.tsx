import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Copy, Check, Gift, Users, Sparkles, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

const ReferralCard = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("referral_code, ai_credits, bonus_builds")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: referralCount = 0 } = useQuery({
    queryKey: ["referrals-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("referrals")
        .select("*", { count: "exact", head: true })
        .eq("referrer_id", user!.id);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const referralLink = profile?.referral_code
    ? `${window.location.origin}/auth?ref=${profile.referral_code}`
    : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copiado!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const nextBuildReward = 3 - (referralCount % 3);
  const progressToNextBuild = ((referralCount % 3) / 3) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-aurora"
    >
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-bold text-foreground">
          Convide e Ganhe Recompensas
        </h2>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <Users className="w-4 h-4 text-secondary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{referralCount}</p>
          <p className="text-xs text-muted-foreground">Convidados</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <Sparkles className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{profile?.ai_credits ?? 0}</p>
          <p className="text-xs text-muted-foreground">Créditos IA</p>
        </div>
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <Zap className="w-4 h-4 text-secondary mx-auto mb-1" />
          <p className="text-xl font-bold text-foreground">{profile?.bonus_builds ?? 0}</p>
          <p className="text-xs text-muted-foreground">Builds Extra</p>
        </div>
      </div>

      {/* Progress to next build reward */}
      <div className="mb-5">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm text-muted-foreground">Próximo build extra</p>
          <p className="text-xs text-primary font-semibold">
            Faltam {nextBuildReward} convite{nextBuildReward !== 1 ? "s" : ""}
          </p>
        </div>
        <Progress value={progressToNextBuild} className="h-2" />
      </div>

      {/* Referral link */}
      <div className="flex gap-2">
        <input
          readOnly
          value={referralLink}
          className="flex-1 px-3 py-2.5 rounded-lg bg-muted border border-border text-foreground text-sm truncate focus:outline-none"
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2.5 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105 flex items-center gap-1.5 text-sm shrink-0"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        +1 crédito IA por convite · +1 build extra a cada 3 convites
      </p>
    </motion.div>
  );
};

export default ReferralCard;
