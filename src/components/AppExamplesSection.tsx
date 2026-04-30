import { useState } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CreditCard, PlayCircle, ShoppingBag, Utensils, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const appExamples = [
  {
    icon: ShoppingBag,
    emoji: "🛍️",
    name: "Loja Virtual",
    description: "Venda produtos com checkout integrado.",
    screenTitle: "Catálogo premium",
    screenLines: ["Novidades", "Carrinho rápido", "Pagamento seguro"],
    accent: "primary",
  },
  {
    icon: CalendarDays,
    emoji: "🐶",
    name: "Pet Shop",
    description: "Agendamentos, catálogo e contato rápido.",
    screenTitle: "Agenda do pet",
    screenLines: ["Banho e tosa", "Produtos", "WhatsApp direto"],
    accent: "accent",
  },
  {
    icon: PlayCircle,
    emoji: "🎓",
    name: "Curso Online",
    description: "Área de membros e conteúdo protegido.",
    screenTitle: "Aulas liberadas",
    screenLines: ["Módulo 01", "Progresso", "Certificado"],
    accent: "primary",
  },
  {
    icon: Utensils,
    emoji: "🍔",
    name: "Delivery",
    description: "Pedidos rápidos e acompanhamento.",
    screenTitle: "Pedido em rota",
    screenLines: ["Menu digital", "Cupom ativo", "Status ao vivo"],
    accent: "accent",
  },
  {
    icon: Wrench,
    emoji: "💼",
    name: "Serviços",
    description: "Agendamento e atendimento automatizado.",
    screenTitle: "Agenda aberta",
    screenLines: ["Orçamentos", "Chat automático", "Clientes"],
    accent: "primary",
  },
  {
    icon: CreditCard,
    emoji: "💳",
    name: "Assinaturas",
    description: "Planos recorrentes e acesso exclusivo.",
    screenTitle: "Plano ativo",
    screenLines: ["Conteúdo VIP", "Renovação", "Benefícios"],
    accent: "accent",
  },
];

type AppExample = (typeof appExamples)[number];

const PhoneMockup = ({ app, large = false }: { app: AppExample; large?: boolean }) => (
  <div className={`mx-auto rounded-[2rem] border border-foreground/15 bg-background p-2 shadow-[0_0_28px_hsl(var(--accent)/0.12)] ${large ? "w-52" : "w-36"}`}>
    <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" />
      <div className="p-3">
        <div className={`mb-3 rounded-xl border p-3 ${app.accent === "primary" ? "border-primary/25 bg-primary/10" : "border-accent/25 bg-accent/10"}`}>
          <div className="mb-2 text-2xl">{app.emoji}</div>
          <p className="text-[11px] font-bold text-foreground">{app.screenTitle}</p>
        </div>
        <div className="space-y-2">
          {app.screenLines.map((line, index) => (
            <div key={line} className="flex items-center gap-2 rounded-lg bg-muted/35 px-2 py-1.5">
              <span className={`h-2 w-2 rounded-full ${index === 1 ? "bg-accent" : "bg-primary"}`} />
              <span className="truncate text-[10px] text-muted-foreground">{line}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto mb-2 h-1 w-12 rounded-full bg-muted-foreground/25" />
    </div>
  </div>
);

const AppExamplesSection = () => {
  const [selectedApp, setSelectedApp] = useState<AppExample | null>(null);

  return (
    <section id="exemplos-apps" className="scroll-mt-24 bg-background px-4 py-20" aria-labelledby="exemplos-apps-title">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 id="exemplos-apps-title" className="mb-3 font-display text-3xl font-bold text-gradient-gold md:text-4xl">
            📱 Exemplos de apps criados com a Aurora
          </h2>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Veja como qualquer site pode virar um app profissional em minutos.
          </p>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {appExamples.map((app, index) => (
            <motion.article
              key={app.name}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              className="group rounded-xl border border-accent/18 bg-card/70 p-5 text-center shadow-[0_0_18px_hsl(var(--accent)/0.06)] transition-all duration-300 hover:scale-[1.02] hover:border-accent/35 hover:shadow-[0_0_34px_hsl(var(--accent)/0.16)]"
            >
              <PhoneMockup app={app} />
              <div className="mt-5 flex items-center justify-center gap-2">
                <app.icon className="h-4 w-4 text-primary" />
                <h3 className="font-display text-lg font-bold text-foreground">{app.name}</h3>
              </div>
              <p className="mt-2 min-h-[40px] text-sm text-muted-foreground">{app.description}</p>
              <button
                type="button"
                onClick={() => setSelectedApp(app)}
                className="mt-4 rounded-lg border border-primary/35 bg-transparent px-4 py-2 text-xs font-bold text-primary transition-all duration-300 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.16)]"
              >
                Ver preview
              </button>
            </motion.article>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-md border-border bg-background">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl text-foreground">
                  Preview — {selectedApp.name}
                </DialogTitle>
                <DialogDescription>{selectedApp.description}</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-accent/20 bg-card/70 p-5">
                <PhoneMockup app={selectedApp} large />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AppExamplesSection;
