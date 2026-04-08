import { Wrench, CheckCircle } from "lucide-react";

const TOOLS = [
  { name: "Conversão Site → App", status: true },
  { name: "Conversão Arquivo → App", status: true },
  { name: "Criar do Zero", status: true },
  { name: "Gerador de Nomes IA", status: true },
  { name: "Gerador de Ideias IA", status: true },
  { name: "Descrição IA", status: true },
  { name: "Gerador de Ícone IA", status: true },
  { name: "Splash Screen IA", status: true },
  { name: "Gerador de Negócio", status: true },
  { name: "Tradução", status: true },
  { name: "Remover Fundo", status: true },
  { name: "Exportação APK", status: true },
  { name: "Exportação AAB", status: true },
  { name: "Exportação PWA", status: true },
];

const AdminTools = () => {
  return (
    <div className="space-y-6">
      <h2 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
        <Wrench className="w-5 h-5 text-primary" /> Ferramentas
      </h2>

      <div className="grid md:grid-cols-2 gap-3">
        {TOOLS.map((tool) => (
          <div key={tool.name} className="card-aurora p-4 flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">{tool.name}</span>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-secondary" />
              <span className="text-xs text-secondary font-semibold">Ativo</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTools;
