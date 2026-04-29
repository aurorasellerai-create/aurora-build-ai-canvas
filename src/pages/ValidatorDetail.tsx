import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, CreditCard, ExternalLink, FileWarning, Gauge, Lock, RefreshCw, Rocket, ShieldAlert, ShieldCheck } from "lucide-react";

const summary = [
  { label: "Fluxo", value: "OK", status: "ok", icon: CheckCircle2 },
  { label: "Navegação", value: "OK", status: "ok", icon: CheckCircle2 },
  { label: "Performance", value: "Atenção", status: "warn", icon: Gauge },
  { label: "Pagamento", value: "Erro detectado", status: "error", icon: CreditCard },
];

const errors = [
  {
    severity: "critical",
    title: "Botão “Começar agora” não executa ação",
    location: "Página inicial · Chamada principal",
    impact: "O usuário pode tentar iniciar a jornada e não avançar para o próximo passo.",
    recommendation: "Conectar o botão ao fluxo correto antes de publicar.",
  },
  {
    severity: "critical",
    title: "Checkout não abriu durante o teste",
    location: "Plano Pro · Finalização de compra",
    impact: "A venda pode ser interrompida antes do pagamento.",
    recommendation: "Validar o link de pagamento e testar novamente o redirecionamento.",
  },
  {
    severity: "warning",
    title: "Tempo de carregamento elevado",
    location: "Primeiro carregamento do app",
    impact: "Parte dos usuários pode abandonar antes de visualizar a tela principal.",
    recommendation: "Reduzir elementos pesados e revisar imagens antes da publicação.",
  },
];

const checks = [
  "Páginas principais carregadas",
  "Botões e chamadas testados",
  "Campos e entradas simulados",
  "Fluxo de usuário percorrido",
  "Abertura de checkout verificada",
  "Pontos básicos de segurança analisados",
];

const getSeverityClasses = (severity: string) => {
  if (severity === "critical") return "border-destructive/30 bg-destructive/5 text-destructive";
  return "border-primary/30 bg-primary/5 text-primary";
};

export default function ValidatorDetail() {
  const { id = "build-demo" } = useParams();
  const buildLabel = id === "latest" ? "Última validação" : id;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/#aurora-validator" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Voltar para Aurora Validator">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display font-bold text-lg text-gradient-gold">Detalhes da validação</h1>
            <p className="text-xs text-muted-foreground">{buildLabel}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10 space-y-6">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="card-aurora p-6 md:p-8 overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent" />
          <div className="grid lg:grid-cols-[1fr_0.72fr] gap-8 items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive mb-5">
                <ShieldAlert className="w-3.5 h-3.5" /> Publicação não recomendada até correção
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">STATUS DO APP</h2>
              <p className="text-muted-foreground max-w-2xl">
                O Aurora Validator analisou a build simulando navegação, cliques, campos, checkout e pontos críticos antes da publicação.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Duração</span>
                <strong className="text-foreground">4,2 segundos</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><FileWarning className="w-4 h-4 text-primary" /> Falhas encontradas</span>
                <strong className="text-destructive">3</strong>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Itens aprovados</span>
                <strong className="text-secondary">6</strong>
              </div>
            </div>
          </div>
        </motion.section>

        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summary.map((item, index) => {
            const Icon = item.icon;
            const statusClass = item.status === "error" ? "text-destructive border-destructive/25 bg-destructive/5" : item.status === "warn" ? "text-primary border-primary/25 bg-primary/5" : "text-secondary border-secondary/25 bg-secondary/5";
            return (
              <motion.div key={item.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className={`rounded-xl border p-5 ${statusClass}`}>
                <Icon className="w-5 h-5 mb-4" />
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <p className="font-display font-bold text-lg text-foreground">{item.value}</p>
              </motion.div>
            );
          })}
        </section>

        <div className="grid lg:grid-cols-[1fr_0.45fr] gap-6 items-start">
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card-aurora p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">Lista de erros da build</h2>
                <p className="text-sm text-muted-foreground">Corrija os itens abaixo e rode uma nova validação.</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
            </div>

            <div className="space-y-4">
              {errors.map((error, index) => (
                <div key={error.title} className={`rounded-xl border p-4 ${getSeverityClasses(error.severity)}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-lg bg-background/80 border border-border flex items-center justify-center text-sm font-bold shrink-0">{index + 1}</span>
                    <div className="space-y-2">
                      <h3 className="font-display font-bold text-foreground">{error.title}</h3>
                      <p className="text-xs text-muted-foreground"><strong className="text-foreground">Local:</strong> {error.location}</p>
                      <p className="text-sm text-muted-foreground"><strong className="text-foreground">Impacto:</strong> {error.impact}</p>
                      <p className="text-sm text-muted-foreground"><strong className="text-foreground">Correção recomendada:</strong> {error.recommendation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          <aside className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="card-aurora p-6">
              <h2 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Verificações executadas
              </h2>
              <div className="space-y-3">
                {checks.map((check) => (
                  <p key={check} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-secondary shrink-0 mt-0.5" /> {check}
                  </p>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="rounded-xl border border-primary/25 bg-primary/5 p-6">
              <h2 className="font-display font-bold text-foreground mb-2">Próximo passo</h2>
              <p className="text-sm text-muted-foreground mb-5">Corrija os erros críticos, valide novamente e publique apenas quando o status estiver aprovado.</p>
              <div className="space-y-3">
                <Link to="/#aurora-validator" className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-3 font-display font-bold glow-gold glow-gold-hover transition-all hover:scale-[1.02]">
                  <RefreshCw className="w-4 h-4" /> Rodar novamente
                </Link>
                <Link to="/generator" className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-secondary/30 text-secondary px-5 py-3 font-display font-bold hover:bg-secondary/10 transition-all">
                  <Rocket className="w-4 h-4" /> Ir para publicação
                </Link>
              </div>
            </motion.div>

            <p className="text-xs text-muted-foreground flex items-start gap-2 px-1">
              <ExternalLink className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> O Validator detecta e orienta. Nenhuma alteração é aplicada automaticamente ao aplicativo.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
