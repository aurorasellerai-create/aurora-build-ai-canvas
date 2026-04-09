import { useState } from "react";
import { Settings, Save, Zap, Crown, Wrench, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PLAN_CONFIG = [
  { plan: "Free", price: "Grátis", credits: 5, builds: 1, formats: ["APK"] },
  { plan: "Pro", price: "R$ 39/mês", credits: 50, builds: 5, formats: ["APK"] },
  { plan: "Premium", price: "R$ 59/mês", credits: 500, builds: 999999, formats: ["APK", "AAB", "PWA"] },
];

const FEATURES = [
  { id: "generate_app", label: "Geração de App", description: "Converter site/arquivo em APK/AAB", enabled: true },
  { id: "ai_tools", label: "Ferramentas IA", description: "Nomes, ideias, descrição, ícone, splash", enabled: true },
  { id: "video_gen", label: "Gerador de Vídeos", description: "Vídeos promocionais com IA", enabled: true },
  { id: "carousel_gen", label: "Gerador de Carrossel", description: "Carrosséis para redes sociais", enabled: true },
  { id: "business_gen", label: "Gerador de Negócio", description: "Plano de negócio completo com IA", enabled: true },
  { id: "convert_aab", label: "Conversão AAB", description: "Converter APK para AAB", enabled: true },
  { id: "translation", label: "Tradução", description: "Traduzir textos do app", enabled: true },
  { id: "remove_bg", label: "Remover Fundo", description: "Remover fundo de imagens", enabled: true },
];

const CREDIT_COSTS = [
  { action: "generate_app", label: "Gerar App", cost: 3 },
  { action: "generate_business", label: "Gerar Negócio", cost: 2 },
  { action: "ai_tool_names", label: "Nomes IA", cost: 1 },
  { action: "ai_tool_ideas", label: "Ideias IA", cost: 1 },
  { action: "ai_tool_description", label: "Descrição IA", cost: 1 },
  { action: "ai_tool_icon", label: "Ícone IA", cost: 1 },
  { action: "ai_tool_splash", label: "Splash IA", cost: 1 },
  { action: "ai_carousel", label: "Carrossel IA", cost: 5 },
  { action: "ai_video_5s", label: "Vídeo 5s", cost: 10 },
  { action: "ai_video_10s", label: "Vídeo 10s", cost: 20 },
  { action: "ai_video_15s", label: "Vídeo 15s", cost: 30 },
  { action: "ai_video_30s", label: "Vídeo 30s", cost: 60 },
  { action: "convert_aab", label: "Conversão AAB", cost: 100 },
];

const AdminSettings = () => {
  const [features, setFeatures] = useState(FEATURES);

  const toggleFeature = (id: string) => {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    toast({ title: "Configuração atualizada", description: "As alterações são locais e temporárias." });
  };

  return (
    <div className="space-y-8">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Configurações
      </h2>

      {/* Plan Config */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" /> Configuração dos Planos
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          {PLAN_CONFIG.map((plan) => (
            <div key={plan.plan} className="card-aurora p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-display font-bold text-foreground">{plan.plan}</h4>
                <span className="text-primary font-bold text-sm">{plan.price}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créditos iniciais</span>
                  <span className="font-bold text-foreground">{plan.credits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Builds/dia</span>
                  <span className="font-bold text-foreground">{plan.builds >= 999 ? "∞" : plan.builds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formatos</span>
                  <span className="font-bold text-foreground">{plan.formats.join(", ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Credit Costs */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Custo por Ação (Créditos)
        </h3>
        <div className="card-aurora p-5">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-2">
            {CREDIT_COSTS.map((item) => (
              <div key={item.action} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-sm font-bold text-primary">{item.cost} créditos</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Toggles */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" /> Funcionalidades
        </h3>
        <div className="grid md:grid-cols-2 gap-3">
          {features.map((feature) => (
            <div key={feature.id} className="card-aurora p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
              <button
                onClick={() => toggleFeature(feature.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  feature.enabled
                    ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                {feature.enabled ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {feature.enabled ? "Ativo" : "Desativado"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminSettings;
