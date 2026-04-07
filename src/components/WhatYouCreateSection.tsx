import { useState } from "react";
import { motion } from "framer-motion";
import { Smartphone, DollarSign, Store, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const cards = [
  {
    icon: Smartphone,
    emoji: "📱",
    title: "App de vendas automáticas",
    desc: "Seu produto vendendo 24h por dia, no automático",
    modal: {
      what: "Um aplicativo que funciona como vitrine digital e vendedor 24h, apresentando seus produtos e direcionando clientes para a compra automaticamente.",
      audience: "Empreendedores digitais, criadores de conteúdo, donos de e-commerce e infoprodutores.",
      benefits: [
        "Funil de vendas integrado",
        "Funciona no piloto automático",
        "Aumenta conversões sem esforço",
        "Disponível 24h para seus clientes",
      ],
      example: "Um infoprodutor cria um app para vender seu curso online, com página de vendas, depoimentos e botão de compra integrado.",
      cta: "Criar meu app de vendas",
      link: "/generator/create",
    },
  },
  {
    icon: DollarSign,
    emoji: "💰",
    title: "App para afiliados",
    desc: "Monetize com links de afiliado integrados",
    modal: {
      what: "Crie um aplicativo para promover produtos e ganhar comissões automaticamente.",
      audience: "Afiliados digitais, influenciadores, criadores de conteúdo e quem quer renda extra.",
      benefits: [
        "Links de afiliado integrados",
        "Monetização automática",
        "Funciona 24h sem intervenção",
        "Escale suas vendas com app próprio",
      ],
      example: "Um afiliado cria um app com curadoria de produtos, reviews e links diretos de compra — ganhando comissão em cada venda.",
      cta: "Criar meu app de afiliado",
      link: "/generator/create",
      upsell: {
        title: "Quer algo mais avançado?",
        desc: "Conheça o Aurora Seller AI — sistema completo para afiliados com automação avançada, funis prontos e rastreamento de comissões.",
        buttons: [
          { label: "Criar dentro do Aurora Build", link: "/generator/create", variant: "default" as const },
          { label: "Conhecer Aurora Seller", link: "https://auroraseller.com.br", variant: "outline" as const, external: true },
        ],
      },
    },
  },
  {
    icon: Store,
    emoji: "🛍️",
    title: "App para negócios locais",
    desc: "Transforme qualquer negócio em digital",
    modal: {
      what: "Transforme qualquer negócio físico em uma presença digital com app próprio — cardápio, catálogo, agendamento e contato direto.",
      audience: "Restaurantes, salões, clínicas, lojas, prestadores de serviço e negócios locais.",
      benefits: [
        "Cardápio ou catálogo digital",
        "Agendamento integrado",
        "Contato direto via WhatsApp",
        "Presença profissional no celular do cliente",
      ],
      example: "Um restaurante cria um app com cardápio interativo, pedidos via WhatsApp e localização no mapa.",
      cta: "Criar app para meu negócio",
      link: "/generator/site",
    },
  },
  {
    icon: Bot,
    emoji: "🤖",
    title: "App com IA integrada",
    desc: "Inteligência artificial trabalhando por você",
    modal: {
      what: "Um aplicativo com inteligência artificial embutida — automação de respostas, geração de conteúdo e atendimento inteligente.",
      audience: "Empreendedores que querem escalar com automação, startups e criadores de ferramentas.",
      benefits: [
        "Automação de tarefas repetitivas",
        "Geração de conteúdo com IA",
        "Atendimento ao cliente 24h",
        "Diferencial competitivo no mercado",
      ],
      example: "Um coach cria um app com chatbot IA que responde dúvidas dos alunos automaticamente e gera planos personalizados.",
      cta: "Criar app com IA",
      link: "/tools",
    },
  },
];

type CardData = (typeof cards)[number];

const WhatYouCreateSection = () => {
  const [selected, setSelected] = useState<CardData | null>(null);

  return (
    <>
      <section className="py-20 px-4 bg-aurora-gradient">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
              Com a Aurora, você cria apps que vendem sozinhos
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Escolha o tipo de app e a Aurora faz o resto
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {cards.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                onClick={() => setSelected(c)}
                className="card-aurora group hover:border-primary/40 transition-all duration-500 text-center cursor-pointer"
              >
                <span className="text-3xl mb-3 block">{c.emoji}</span>
                <h3 className="font-display text-base font-bold text-foreground mb-2">{c.title}</h3>
                <p className="text-muted-foreground text-sm">{c.desc}</p>
                <span className="mt-3 inline-block text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Saiba mais →
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-border bg-background">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-3xl">{selected.emoji}</span>
                  <DialogTitle className="font-display text-xl text-foreground">
                    {selected.title}
                  </DialogTitle>
                </div>
                <DialogDescription>{selected.modal.what}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">👤 Para quem é</h4>
                  <p className="text-sm text-muted-foreground">{selected.modal.audience}</p>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">✅ Benefícios</h4>
                  <ul className="space-y-1">
                    {selected.modal.benefits.map((b) => (
                      <li key={b} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span> {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-foreground mb-1">💡 Exemplo de uso</h4>
                  <p className="text-sm text-muted-foreground italic">{selected.modal.example}</p>
                </div>

                <Link to={selected.modal.link} onClick={() => setSelected(null)}>
                  <Button className="w-full mt-2 glow-gold glow-gold-hover font-display font-bold">
                    {selected.modal.cta}
                  </Button>
                </Link>

                {selected.modal.upsell && (
                  <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                    <h4 className="text-sm font-bold text-foreground mb-1">
                      🚀 {selected.modal.upsell.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {selected.modal.upsell.desc}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {selected.modal.upsell.buttons.map((btn) =>
                        btn.external ? (
                          <a
                            key={btn.label}
                            href={btn.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1"
                          >
                            <Button variant={btn.variant} className="w-full text-xs">
                              {btn.label}
                            </Button>
                          </a>
                        ) : (
                          <Link
                            key={btn.label}
                            to={btn.link}
                            onClick={() => setSelected(null)}
                            className="flex-1"
                          >
                            <Button variant={btn.variant} className="w-full text-xs">
                              {btn.label}
                            </Button>
                          </Link>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatYouCreateSection;
