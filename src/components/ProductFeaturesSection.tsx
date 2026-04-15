import { motion } from "framer-motion";
import { Code2, Smartphone, Download, Sparkles, Globe, Layers, Zap, Shield, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FEATURES = [
  { icon: Code2, title: "Criação sem código", desc: "Cole a URL do seu site e a IA faz o resto. Nenhuma linha de código necessária.", link: "/generator/create", cta: "Criar app", span: "md:col-span-2 md:row-span-1" },
  { icon: Smartphone, title: "App real e funcional", desc: "Seu aplicativo funciona como qualquer app nativo — com ícone, tela cheia e navegação.", link: "/generator/site", cta: "Começar", span: "md:col-span-1 md:row-span-2" },
  { icon: Download, title: "Exportação profissional", desc: "Baixe em APK para testes, AAB para a Play Store ou PWA para distribuição web.", link: "/generator/convert", cta: "Exportar", span: "md:col-span-1 md:row-span-1" },
  { icon: Globe, title: "PWA multiplataforma", desc: "Use como app web instalável. Funciona em Android e iPhone sem precisar de loja.", link: "/generator/site", cta: "Gerar PWA", span: "md:col-span-1 md:row-span-1" },
  { icon: Sparkles, title: "IA integrada", desc: "Gere nomes, descrições, ícones e copys com Inteligência Artificial.", link: "/tools", cta: "Acessar IA", span: "md:col-span-1 md:row-span-1" },
  { icon: Layers, title: "Tudo em um só lugar", desc: "Crie, exporte, publique e gerencie — tudo dentro do Aurora Build AI.", link: "/generator", cta: "Começar", span: "md:col-span-2 md:row-span-1" },
  { icon: Zap, title: "Sistema de créditos", desc: "Pague só pelo que usar. Sem mensalidade obrigatória.", link: "/credits", cta: "Ver créditos", span: "md:col-span-1 md:row-span-1" },
  { icon: Shield, title: "Pronto para publicar", desc: "Formato AAB compatível com a Google Play Store.", link: "/generator/create", cta: "Gerar AAB", span: "md:col-span-1 md:row-span-1" },
];

export default function ProductFeaturesSection() {
  return (
    <section className="py-20 px-4 relative overflow-hidden" aria-label="Funcionalidades para criar app Android com IA">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 30% at 50% 0%, hsl(51 100% 50% / 0.03), transparent)" }} />

      <div className="max-w-6xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-xs font-medium text-primary mb-4"
          >
            Tudo que você precisa
          </motion.span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
            Crie seu aplicativo com IA
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transforme qualquer site em app em minutos — sem código, sem complicação
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {FEATURES.map((f, i) => (
            <Link key={i} to={f.link} className={f.span}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="group relative h-full p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-sm overflow-hidden transition-all duration-500 hover:border-primary/20 hover:bg-white/[0.04]"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                  style={{
                    background: "radial-gradient(circle at 50% 50%, hsl(51 100% 50% / 0.05), transparent 70%)",
                  }}
                />

                {/* Icon */}
                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                    <f.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="font-display font-bold text-foreground text-base mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    {f.cta} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>

                {/* Corner accent */}
                <div className="absolute -bottom-1 -right-1 w-20 h-20 rounded-tl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: "linear-gradient(135deg, transparent 40%, hsl(51 100% 50% / 0.08))",
                  }}
                />
              </motion.div>
            </Link>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-xl glow-gold glow-gold-hover transition-all hover:scale-105"
          >
            Começar agora — é grátis
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
