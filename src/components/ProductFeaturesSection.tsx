import { motion } from "framer-motion";
import { Code2, Smartphone, Download, Sparkles, Globe, Layers, Zap, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: Code2, title: "Criação sem código", desc: "Cole a URL do seu site e a IA faz o resto. Nenhuma linha de código necessária.", link: "/generator/create", cta: "Criar app" },
  { icon: Smartphone, title: "App real e funcional", desc: "Seu aplicativo funciona como qualquer app nativo — com ícone, tela cheia e navegação.", link: "/generator/site", cta: "Começar" },
  { icon: Download, title: "Exportação profissional", desc: "Baixe em APK para testes, AAB para a Play Store ou PWA para distribuição web.", link: "/generator/convert", cta: "Exportar" },
  { icon: Globe, title: "PWA multiplataforma", desc: "Use como app web instalável. Funciona em Android e iPhone sem precisar de loja.", link: "/generator/site", cta: "Gerar PWA" },
  { icon: Sparkles, title: "IA integrada", desc: "Gere nomes, descrições, ícones e copys com Inteligência Artificial.", link: "/tools", cta: "Acessar IA" },
  { icon: Layers, title: "Tudo em um só lugar", desc: "Crie, exporte, publique e gerencie — tudo dentro do Aurora Build AI.", link: "/generator", cta: "Começar" },
  { icon: Zap, title: "Sistema de créditos", desc: "Pague só pelo que usar. Sem mensalidade obrigatória.", link: "/credits", cta: "Ver créditos" },
  { icon: Shield, title: "Pronto para publicar", desc: "Formato AAB compatível com a Google Play Store.", link: "/generator/create", cta: "Gerar AAB" },
];

export default function ProductFeaturesSection() {
  return (
    <section className="py-16 px-4" aria-label="Funcionalidades para criar app Android com IA">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
            Crie seu aplicativo com Inteligência Artificial
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transforme qualquer site em app em minutos — sem código, sem complicação
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {FEATURES.map((f, i) => (
            <Link
              key={i}
              to={f.link}
            >
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl border border-border bg-muted/30 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group cursor-pointer h-full flex flex-col"
              >
                <f.icon className="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-display font-bold text-foreground text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed flex-1">{f.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {f.cta} <ArrowRight className="w-3 h-3" />
                </span>
              </motion.div>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105"
          >
            Começar agora — é grátis
          </Link>
        </div>
      </div>
    </section>
  );
}
