import { motion } from "framer-motion";
import { Globe, Download, PenTool, Lightbulb, Languages, Image, Eraser, ShoppingCart, Users, Building2, Bot, ArrowRight, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tools = [
  { icon: Globe, title: "Conversão de site para app", desc: "Transforme qualquer site em aplicativo", route: "/generator/site", cost: 3 },
  { icon: Download, title: "Exportação APK / AAB / PWA", desc: "Gere builds em múltiplos formatos", route: "/generator", cost: 3 },
  { icon: PenTool, title: "Gerador de nomes", desc: "Nomes criativos com IA", route: "/tools", cost: 1 },
  { icon: Lightbulb, title: "Gerador de ideias", desc: "Descubra nichos lucrativos", route: "/tools", cost: 1 },
  { icon: Languages, title: "Tradução automática", desc: "Traduza seu app para outros idiomas", route: "/tools", cost: 1 },
  { icon: Image, title: "Criador de logo", desc: "Logos profissionais com IA", route: "/tools", cost: 1 },
  { icon: Eraser, title: "Remover fundo de imagem", desc: "Backgrounds transparentes instantâneos", route: "/tools", cost: 1 },
  { icon: ShoppingCart, title: "Estrutura de vendas", desc: "Funil de vendas automatizado", route: "/business", cost: 2 },
  { icon: Users, title: "App para afiliados", desc: "Sistema completo para afiliados", route: "/business", cost: 2 },
  { icon: Building2, title: "App para negócios locais", desc: "Apps para empresas da sua cidade", route: "/business", cost: 2 },
  { icon: Bot, title: "App com IA integrada", desc: "Aplicativos inteligentes com IA", route: "/business", cost: 2 },
];

const AIToolsSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4" id="ferramentas">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-6"
        >
          <span className="text-3xl mb-4 block">⚡</span>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-gradient-gold mb-3">
            Ferramentas disponíveis
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Tudo o que você precisa para criar, publicar e monetizar seus apps
          </p>
        </motion.div>

        {/* UX explanation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {[
            { emoji: "🔑", label: "Plano = acesso ao sistema" },
            { emoji: "💰", label: "Créditos = uso das funcionalidades" },
            { emoji: "⚡", label: "Ferramentas = o que você pode fazer" },
          ].map((item) => (
            <span
              key={item.label}
              className="text-xs font-display bg-muted/50 border border-border px-3 py-1.5 rounded-full text-muted-foreground"
            >
              {item.emoji} {item.label}
            </span>
          ))}
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tools.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              onClick={() => navigate(t.route)}
              className="card-aurora group cursor-pointer hover:border-primary/50 hover:scale-[1.03] transition-all duration-300 flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <t.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-sm font-bold text-foreground leading-tight">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[10px] font-display text-muted-foreground flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  {t.cost} {t.cost === 1 ? "crédito" : "créditos"}
                </span>
                <span className="text-xs font-display font-bold text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  Usar <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIToolsSection;
