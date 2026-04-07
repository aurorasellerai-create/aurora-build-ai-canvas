import { motion } from "framer-motion";
import { Smartphone, DollarSign, Store, Bot } from "lucide-react";

const cards = [
  { icon: Smartphone, emoji: "📱", title: "App de vendas automáticas", desc: "Seu produto vendendo 24h por dia, no automático" },
  { icon: DollarSign, emoji: "💰", title: "App para afiliados", desc: "Monetize com links de afiliado integrados" },
  { icon: Store, emoji: "🛍️", title: "App para negócios locais", desc: "Transforme qualquer negócio em digital" },
  { icon: Bot, emoji: "🤖", title: "App com IA integrada", desc: "Inteligência artificial trabalhando por você" },
];

const WhatYouCreateSection = () => (
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
            className="card-aurora group hover:border-primary/40 transition-all duration-500 text-center cursor-default"
          >
            <span className="text-3xl mb-3 block">{c.emoji}</span>
            <h3 className="font-display text-base font-bold text-foreground mb-2">{c.title}</h3>
            <p className="text-muted-foreground text-sm">{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhatYouCreateSection;
