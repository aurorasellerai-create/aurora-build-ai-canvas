import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Lucas M.",
    text: "Nunca imaginei criar um app e vender assim. A Aurora fez tudo por mim!",
    role: "Empreendedor digital",
  },
  {
    name: "Ana C.",
    text: "Fiz meu primeiro dinheiro em poucos dias. O app roda no automático.",
    role: "Afiliada",
  },
  {
    name: "Pedro R.",
    text: "Criei o app do meu negócio local em 10 minutos. Inacreditável.",
    role: "Dono de restaurante",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-5xl mx-auto text-center">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-4"
      >
        Quem já começou, não volta atrás
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-muted-foreground mb-12"
      >
        Veja o que dizem sobre a Aurora Build AI
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
            <p className="text-foreground text-sm mb-4 italic">"{t.text}"</p>
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
