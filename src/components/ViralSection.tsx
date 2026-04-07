import { motion } from "framer-motion";

const items = [
  { emoji: "📤", title: "Botão de compartilhar integrado", desc: "Seus usuários divulgam o app por você" },
  { emoji: "🔗", title: "Link de convite automático", desc: "Cada usuário gera seu próprio link viral" },
  { emoji: "🎁", title: "Sistema de recompensa", desc: "Ganhe créditos e builds por cada indicação" },
];

const ViralSection = () => (
  <section className="py-20 px-4">
    <div className="max-w-4xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-cyan mb-4"
      >
        Seu app já nasce pronto para crescer sozinho
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-12"
      >
        Sistema viral integrado para crescimento orgânico
      </motion.p>

      <div className="grid sm:grid-cols-3 gap-5">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="card-aurora text-center"
          >
            <span className="text-3xl mb-3 block">{item.emoji}</span>
            <h3 className="font-display text-base font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-muted-foreground text-sm">{item.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ViralSection;
