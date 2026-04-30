import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarDays, CreditCard, PlayCircle, ShoppingBag, Utensils, Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analytics } from "@/lib/analytics";

export const appExamples = [
  {
    slug: "loja-virtual",
    icon: ShoppingBag,
    emoji: "🛍️",
    name: "Loja Virtual",
    description: "Venda produtos com checkout integrado.",
    screenTitle: "Catálogo premium",
    screenLines: ["Novidades", "Carrinho rápido", "Pagamento seguro"],
    previewTitle: "Aurora Store",
    previewSubtitle: "Coleção em destaque",
    primaryAction: "Finalizar compra",
    stats: ["12 produtos", "Checkout Pix", "Cupom ativo"],
    items: ["Tênis Urban Pro", "Kit Creator", "Assinatura VIP"],
    accent: "primary",
  },
  {
    slug: "petshop",
    icon: CalendarDays,
    emoji: "🐶",
    name: "Pet Shop",
    description: "Agendamentos, catálogo e contato rápido.",
    screenTitle: "Agenda do pet",
    screenLines: ["Banho e tosa", "Produtos", "WhatsApp direto"],
    previewTitle: "Pet Feliz",
    previewSubtitle: "Próximos horários",
    primaryAction: "Agendar banho",
    stats: ["Hoje 14:30", "Catálogo", "Contato rápido"],
    items: ["Banho premium", "Tosa higiênica", "Ração especial"],
    accent: "accent",
  },
  {
    slug: "curso-online",
    icon: PlayCircle,
    emoji: "🎓",
    name: "Curso Online",
    description: "Área de membros e conteúdo protegido.",
    screenTitle: "Aulas liberadas",
    screenLines: ["Módulo 01", "Progresso", "Certificado"],
    previewTitle: "Academia Pro",
    previewSubtitle: "Continue assistindo",
    primaryAction: "Assistir aula",
    stats: ["68% completo", "8 módulos", "Certificado"],
    items: ["Aula 04 — Oferta", "Checklist final", "Comunidade"],
    accent: "primary",
  },
  {
    slug: "delivery",
    icon: Utensils,
    emoji: "🍔",
    name: "Delivery",
    description: "Pedidos rápidos e acompanhamento.",
    screenTitle: "Pedido em rota",
    screenLines: ["Menu digital", "Cupom ativo", "Status ao vivo"],
    previewTitle: "Burger Now",
    previewSubtitle: "Pedido em preparo",
    primaryAction: "Acompanhar pedido",
    stats: ["18 min", "Cupom ON", "Entrega live"],
    items: ["Combo Aurora", "Batata extra", "Refrigerante"],
    accent: "accent",
  },
  {
    slug: "servicos",
    icon: Wrench,
    emoji: "💼",
    name: "Serviços",
    description: "Agendamento e atendimento automatizado.",
    screenTitle: "Agenda aberta",
    screenLines: ["Orçamentos", "Chat automático", "Clientes"],
    previewTitle: "Serviços Pro",
    previewSubtitle: "Atendimento automático",
    primaryAction: "Solicitar orçamento",
    stats: ["24h online", "Agenda", "Chat IA"],
    items: ["Consultoria", "Instalação", "Suporte mensal"],
    accent: "primary",
  },
  {
    slug: "assinaturas",
    icon: CreditCard,
    emoji: "💳",
    name: "Assinaturas",
    description: "Planos recorrentes e acesso exclusivo.",
    screenTitle: "Plano ativo",
    screenLines: ["Conteúdo VIP", "Renovação", "Benefícios"],
    previewTitle: "Clube Premium",
    previewSubtitle: "Plano anual ativo",
    primaryAction: "Ver benefícios",
    stats: ["VIP ativo", "Renova em 22d", "Área exclusiva"],
    items: ["Conteúdo mensal", "Suporte prioridade", "Bônus liberado"],
    accent: "accent",
  },
];

export type AppExample = (typeof appExamples)[number];

const getAccentClasses = (accent: AppExample["accent"]) =>
  accent === "primary"
    ? "border-primary/25 bg-primary/10 text-primary"
    : "border-accent/25 bg-accent/10 text-accent";

const PhoneMockup = ({ app, large = false }: { app: AppExample; large?: boolean }) => (
  <div className={`mx-auto rounded-[2rem] border border-foreground/15 bg-background p-2 shadow-[0_0_28px_hsl(var(--accent)/0.12)] ${large ? "w-52" : "w-36"}`}>
    <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card">
      <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40" />
      <div className="p-3">
        <div className={`mb-3 rounded-xl border p-3 ${getAccentClasses(app.accent)}`}>
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

export const AppSimulation = ({ app, trackingPrefix }: { app: AppExample; trackingPrefix?: string }) => (
  <div className="grid gap-5 md:grid-cols-[240px_1fr] md:items-center">
    <div data-preview-section={trackingPrefix ? `${trackingPrefix}-simulacao` : undefined} className="mx-auto w-full max-w-[240px] rounded-[2.4rem] border border-foreground/15 bg-background p-2 shadow-[0_0_38px_hsl(var(--accent)/0.18)]">
      <div className="overflow-hidden rounded-[1.8rem] border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 text-[10px] text-muted-foreground">
          <span>9:41</span>
          <span className="h-1 w-14 rounded-full bg-muted-foreground/35" />
          <span>5G</span>
        </div>

        <div className="px-4 pb-4">
          <div className={`rounded-2xl border p-4 ${getAccentClasses(app.accent)}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">{app.previewTitle}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{app.previewSubtitle}</p>
              </div>
              <span className="text-3xl leading-none">{app.emoji}</span>
            </div>
            <button className="mt-4 w-full rounded-xl bg-primary px-3 py-2 text-[11px] font-bold text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.18)]">
              {app.primaryAction}
            </button>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {app.stats.map((stat) => (
              <div key={stat} className="rounded-xl border border-border bg-muted/25 px-2 py-2 text-center">
                <span className="block truncate text-[9px] font-semibold text-foreground">{stat}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 space-y-2">
            {app.items.map((item, index) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-border bg-background/45 px-3 py-2">
                <span className={`h-7 w-7 shrink-0 rounded-lg ${index === 1 ? "bg-accent/15" : "bg-primary/15"}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-bold text-foreground">{item}</p>
                  <p className="truncate text-[9px] text-muted-foreground">Pronto para uso no app</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-border bg-muted/20 px-3 py-2 text-center text-[9px] text-muted-foreground">
          <span>Início</span>
          <span className="font-bold text-primary">App</span>
          <span>Conta</span>
        </div>
      </div>
    </div>

    <div className="space-y-4 text-left">
      <div className="rounded-xl border border-accent/20 bg-card/70 p-4">
        <p className="text-sm font-bold text-foreground">Simulação interativa do app</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Este preview mostra como o cliente veria a experiência principal do app: tela inicial, ação de conversão, destaques e navegação mobile.
        </p>
      </div>
      <div data-preview-section={trackingPrefix ? `${trackingPrefix}-cta` : undefined} className="flex justify-end">
        <Link
          to={`/auth?source=preview&preview=${app.slug}&origin=modal`}
          onClick={() => analytics.previewCreateAppClicked(app.slug, app.name, "modal")}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-display font-bold text-primary-foreground shadow-[0_0_22px_hsl(var(--primary)/0.22)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_34px_hsl(var(--primary)/0.34)]"
        >
          Criar um app como este
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {app.stats.map((stat) => (
          <div key={stat} className="rounded-lg border border-border bg-muted/25 p-3 text-center">
            <p className="text-xs font-bold text-foreground">{stat}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AppExamplesSection = () => {
  const [selectedApp, setSelectedApp] = useState<AppExample | null>(null);
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  const openPreviewModal = (app: AppExample) => {
    analytics.previewModalViewed(app.slug, app.name);
    setSelectedApp(app);
  };

  useEffect(() => {
    if (!selectedApp || !modalContentRef.current) return;

    const viewedSections = new Set<string>();
    const sectionMap = new Map([
      ["modal-nome", "nome"],
      ["modal-simulacao", "simulacao"],
      ["modal-cta", "cta"],
    ] as const);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const key = entry.target.getAttribute("data-preview-section");
          const section = key ? sectionMap.get(key as "modal-nome" | "modal-simulacao" | "modal-cta") : undefined;

          if (!entry.isIntersecting || !section || viewedSections.has(section)) return;

          viewedSections.add(section);
          analytics.previewModalSectionViewed(selectedApp.slug, selectedApp.name, section);
        });
      },
      { threshold: 0.55 },
    );

    modalContentRef.current.querySelectorAll("[data-preview-section]").forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [selectedApp]);

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
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => openPreviewModal(app)}
                  className="rounded-lg border border-primary/35 bg-transparent px-4 py-2 text-xs font-bold text-primary transition-all duration-300 hover:border-primary/60 hover:bg-primary/5 hover:shadow-[0_0_20px_hsl(var(--primary)/0.16)]"
                >
                  Ver preview rápido
                </button>
                <Link
                  to={`/preview/${app.slug}`}
                  className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-bold text-accent transition-all duration-300 hover:border-accent/55 hover:bg-accent/15 hover:shadow-[0_0_20px_hsl(var(--accent)/0.14)]"
                >
                  Abrir completo
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto border-border bg-background">
          {selectedApp && (
            <>
              <DialogHeader data-preview-section="modal-nome">
                <DialogTitle className="font-display text-xl text-foreground">
                  Preview — {selectedApp.name}
                </DialogTitle>
                <DialogDescription>{selectedApp.description}</DialogDescription>
              </DialogHeader>
              <div ref={modalContentRef} className="rounded-xl border border-accent/20 bg-card/70 p-4 md:p-5">
                <AppSimulation app={selectedApp} trackingPrefix="modal" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default AppExamplesSection;
