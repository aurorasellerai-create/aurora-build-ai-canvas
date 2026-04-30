import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "Como transformar meu site em aplicativo (APK ou AAB)? Preciso programar?",
    a: "Não — o processo é simples e automático. Você não precisa programar nem converter arquivos manualmente. Cole o link do seu site, clique em “Criar app”, baixe o arquivo do projeto (.ZIP), abra no Android Studio, clique em “Build” e gere APK ou AAB. Pronto. Seu aplicativo estará funcionando. Importante: você não está convertendo o site diretamente; o sistema cria um aplicativo baseado no seu site, garantindo mais estabilidade, compatibilidade com Android e padrão profissional.",
  },
  {
    q: "Preciso saber programar para criar um app?",
    a: "Não! A Aurora Build AI usa inteligência artificial para criar seu aplicativo automaticamente. Basta colar a URL do seu site ou descrever sua ideia. Zero código necessário.",
  },
  {
    q: "Qual a diferença entre APK, AAB e PWA?",
    a: "APK é para instalar diretamente no celular Android para testes. AAB é o formato oficial exigido pela Google Play Store para publicação. PWA é um app web instalável que funciona em Android e iPhone sem precisar de loja.",
  },
  {
    q: "Quanto tempo leva para criar um app?",
    a: "Em média, menos de 5 minutos. A IA automatiza todo o processo — desde a criação até a exportação pronta para publicação.",
  },
  {
    q: "Posso publicar meu app na Google Play Store?",
    a: "Sim! Exporte no formato AAB e envie pelo Google Play Console. Você precisa de uma conta Google Developer, que tem uma taxa única de US$ 25.",
  },
  {
    q: "O que são créditos e como funcionam?",
    a: "Créditos são a moeda de uso das ferramentas de IA. Cada ação (gerar app, criar logo, traduzir) consome uma quantidade específica de créditos. Planos pagos já incluem créditos, e você pode comprar pacotes avulsos.",
  },
  {
    q: "Posso cancelar meu plano a qualquer momento?",
    a: "Sim, todos os planos podem ser cancelados quando quiser. Sem multas, sem burocracia. Você continua com acesso até o fim do período pago.",
  },
  {
    q: "A Aurora funciona para qualquer tipo de negócio?",
    a: "Sim! Empreendedores digitais, afiliados, donos de negócios locais, restaurantes, e-commerces — qualquer pessoa pode criar seu app e começar a monetizar.",
  },
];

const FAQSection = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-20 px-4" id="faq" aria-label="Perguntas frequentes sobre criar app com IA">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Perguntas frequentes
          </h2>
          <p className="text-muted-foreground">
            Tire suas dúvidas antes de começar a criar seu app
          </p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
                aria-expanded={open === i}
              >
                <h3 className="text-sm font-bold text-foreground pr-4">{faq.q}</h3>
                <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${open === i ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
