import { useState, useEffect } from "react";
import { useAdminSettings, useSaveSettings } from "./useAdminData";
import { Wrench, CheckCircle, XCircle, Loader2 } from "lucide-react";

const TOOL_INFO: Record<string, { label: string; description: string }> = {
  generate_app: { label: "Conversão Site/Arquivo → App", description: "Converter site ou arquivo em APK/AAB" },
  ai_tools: { label: "Ferramentas IA", description: "Nomes, ideias, descrição, ícone, splash" },
  video_gen: { label: "Gerador de Vídeos", description: "Vídeos promocionais com IA" },
  carousel_gen: { label: "Gerador de Carrossel", description: "Carrosséis para redes sociais" },
  business_gen: { label: "Gerador de Negócio", description: "Plano de negócio completo com IA" },
  convert_aab: { label: "Conversão AAB", description: "Converter APK para AAB" },
  translation: { label: "Tradução", description: "Traduzir textos do app" },
  remove_bg: { label: "Remover Fundo", description: "Remover fundo de imagens" },
};

const AdminTools = () => {
  const { data: settings, isLoading } = useAdminSettings(true);
  const saveSettings = useSaveSettings();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (settings?.feature_toggles) {
      setToggles(settings.feature_toggles);
    }
  }, [settings]);

  const handleToggle = (id: string) => {
    const updated = { ...toggles, [id]: !toggles[id] };
    setToggles(updated);
    saveSettings.mutate({ key: "feature_toggles", value: updated });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" /> Ferramentas
      </h2>

      <p className="text-sm text-muted-foreground">
        Ative ou desative funcionalidades do sistema. Alterações são salvas automaticamente e persistem após reload.
      </p>

      <div className="grid md:grid-cols-2 gap-3">
        {Object.entries(TOOL_INFO).map(([id, info]) => {
          const enabled = toggles[id] !== false;
          return (
            <div key={id} className="card-aurora p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{info.label}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </div>
              <button
                onClick={() => handleToggle(id)}
                disabled={saveSettings.isPending}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  enabled
                    ? "bg-secondary/10 text-secondary hover:bg-secondary/20"
                    : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                }`}
              >
                {enabled ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                {enabled ? "Ativo" : "Desativado"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminTools;
