import { useState, useEffect } from "react";
import { Settings, Save, Zap, Crown, Wrench } from "lucide-react";
import { useAdminSettings, useSaveSettings } from "./useAdminData";
import { Loader2 } from "lucide-react";

const AdminSettings = () => {
  const { data: settings, isLoading } = useAdminSettings(true);
  const saveSettings = useSaveSettings();

  const [globalConfig, setGlobalConfig] = useState({ system_name: "Aurora Build", maintenance_mode: false });
  const [creditCosts, setCreditCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings?.global_config) setGlobalConfig(settings.global_config);
    if (settings?.credit_costs) setCreditCosts(settings.credit_costs);
  }, [settings]);

  const saveGlobal = () => {
    saveSettings.mutate({ key: "global_config", value: globalConfig });
  };

  const saveCosts = () => {
    saveSettings.mutate({ key: "credit_costs", value: creditCosts });
  };

  const COST_LABELS: Record<string, string> = {
    generate_app: "Gerar App",
    generate_business: "Gerar Negócio",
    ai_tool_names: "Nomes IA",
    ai_tool_ideas: "Ideias IA",
    ai_tool_description: "Descrição IA",
    ai_tool_icon: "Ícone IA",
    ai_tool_splash: "Splash IA",
    ai_carousel: "Carrossel IA",
    ai_video_5s: "Vídeo 5s",
    ai_video_10s: "Vídeo 10s",
    ai_video_15s: "Vídeo 15s",
    ai_video_30s: "Vídeo 30s",
    ai_video_continue: "Continuar Vídeo",
    convert_aab: "Conversão AAB",
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" /> Configurações
      </h2>

      {/* Global Config */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-primary" /> Configurações Globais
        </h3>
        <div className="card-aurora p-5 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground font-semibold">Nome do Sistema</label>
            <input
              value={globalConfig.system_name}
              onChange={(e) => setGlobalConfig({ ...globalConfig, system_name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mt-1"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Modo Manutenção</p>
              <p className="text-xs text-muted-foreground">Desativa o acesso público ao sistema</p>
            </div>
            <button
              onClick={() => setGlobalConfig({ ...globalConfig, maintenance_mode: !globalConfig.maintenance_mode })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                globalConfig.maintenance_mode
                  ? "bg-destructive/10 text-destructive"
                  : "bg-secondary/10 text-secondary"
              }`}
            >
              {globalConfig.maintenance_mode ? "Ativado" : "Desativado"}
            </button>
          </div>
          <button
            onClick={saveGlobal}
            disabled={saveSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Salvar Globais
          </button>
        </div>
      </section>

      {/* Credit Costs */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Custo por Ação (Créditos)
        </h3>
        <div className="card-aurora p-5">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(COST_LABELS).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">{label}</span>
                <input
                  type="number"
                  min={0}
                  value={creditCosts[key] ?? 0}
                  onChange={(e) => setCreditCosts({ ...creditCosts, [key]: Number(e.target.value) })}
                  className="w-20 px-2 py-1 rounded-lg bg-muted border border-border text-foreground text-sm text-center"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveCosts}
            disabled={saveSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 mt-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> Salvar Custos
          </button>
        </div>
      </section>

      {/* Plan config note */}
      <section>
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" /> Planos
        </h3>
        <div className="card-aurora p-5">
          <p className="text-sm text-muted-foreground">
            Os planos podem ser editados diretamente na aba <strong>Planos</strong> do menu lateral.
            As alterações são salvas automaticamente no banco de dados.
          </p>
        </div>
      </section>
    </div>
  );
};

export default AdminSettings;
