import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Lucas M.",
    text: "Criei meu primeiro app em 10 minutos e já comecei a vender. Nunca imaginei que seria tão fácil. A Aurora mudou minha vida.",
    role: "Empreendedor digital",
    result: "Faturou R$ 3.200 no primeiro mês",
  },
  {
    name: "Ana C.",
    text: "Era afiliada e não conseguia se destacar. Com o app próprio, minhas comissões triplicaram. O app roda no automático enquanto eu durmo.",
    role: "Afiliada digital",
    result: "3x mais comissões em 30 dias",
  },
  {
    name: "Pedro R.",
    text: "Tenho um restaurante e precisava de um app. Gastaria R$ 5 mil com desenvolvedor. Na Aurora, fiz em 10 minutos e funciona perfeitamente.",
    role: "Dono de restaurante",
    result: "Economizou R$ 5.000 em desenvolvimento",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 px-4 bg-aurora-gradient" aria-label="Depoimentos de clientes Aurora Build">
    <div className="max-w-5xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3"
      >
        Quem começou não volta atrás
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-12"
      >
        Resultados reais de quem usou a Aurora Build AI
      </motion.p>

      <div className="grid md:grid-cols-3 gap-5">
        {testimonials.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
            className="card-aurora text-left"
          >
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, s) => (
                <Star key={s} className="w-4 h-4 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-foreground text-sm mb-3 italic leading-relaxed">"{t.text}"</p>
            <p className="text-xs font-bold text-primary mb-3 bg-primary/10 px-2 py-1 rounded-full inline-block">
              📈 {t.result}
            </p>
            <div>
              <p className="text-foreground text-sm font-bold">{t.name}</p>
              <p className="text-muted-foreground text-xs">{t.role}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
