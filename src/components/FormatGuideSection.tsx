import { motion } from "framer-motion";
import { Smartphone, Store, Globe, AlertTriangle, Info, ArrowRight, Download, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const FORMAT_INFO = [
  {
    format: "APK",
    icon: Smartphone,
    title: "APK — Teste Local",
    desc: "Instale diretamente no seu celular Android para testes. Ideal para validar antes de publicar.",
    use: "Testes internos e demonstração",
    warning: "Não é aceito na Google Play Store",
    color: "text-primary",
  },
  {
    format: "AAB",
    icon: Store,
    title: "AAB — Google Play Store",
    desc: "Formato oficial exigido pela Google Play. Necessário para publicação profissional.",
    use: "Publicação na Google Play Store",
    tip: "Requer conta Google Developer (US$ 25 única vez)",
    color: "text-secondary",
  },
  {
    format: "PWA",
    icon: Globe,
    title: "PWA — App Web Instalável",
    desc: "App que funciona pelo navegador e pode ser instalado na tela inicial. Sem necessidade de loja.",
    use: "Distribuição rápida via link",
    tip: "Funciona em Android e iPhone",
    color: "text-accent-foreground",
  },
];

export default function FormatGuideSection() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Exporte para Android (APK e AAB)
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entenda cada formato e escolha o ideal para o seu objetivo
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {FORMAT_INFO.map((f, i) => (
            <motion.div
              key={f.format}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-aurora p-6 flex flex-col"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-display font-bold text-foreground">{f.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4 flex-1">{f.desc}</p>
              <div className="space-y-2">
                <p className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                  <ArrowRight className="w-3 h-3 text-primary" /> {f.use}
                </p>
                {f.warning && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> {f.warning}
                  </p>
                )}
                {f.tip && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-primary" /> {f.tip}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <Link
            to="/generator"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105"
          >
            <Download className="w-5 h-5" /> Criar e exportar meu app agora
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
