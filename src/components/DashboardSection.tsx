import { motion } from "framer-motion";
import { Download, Eye, Loader2, CheckCircle2 } from "lucide-react";

const apps = [
  { name: "MeuSite App", status: "gerando", progress: 65 },
  { name: "Loja Virtual", status: "pronto", progress: 100 },
];

const DashboardSection = () => (
  <section className="py-20 px-4 bg-aurora-gradient">
    <div className="max-w-4xl mx-auto">
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="text-3xl md:text-5xl font-display font-bold text-center text-gradient-cyan mb-16"
      >
        Seu Dashboard
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="card-aurora"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h3 className="font-display text-xl font-bold text-foreground">Bem-vindo, Usuário!</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Plano: <span className="text-primary font-semibold">Pro</span>
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {apps.map((app) => (
            <div
              key={app.name}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg bg-muted/50 border border-border gap-4"
            >
              <div className="flex items-center gap-3">
                {app.status === "pronto" ? (
                  <CheckCircle2 className="w-5 h-5 text-secondary" />
                ) : (
                  <Loader2 className="w-5 h-5 text-secondary animate-spin" />
                )}
                <div>
                  <p className="font-semibold text-foreground">{app.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{app.status}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    app.status === "pronto"
                      ? "bg-primary text-primary-foreground glow-gold glow-gold-hover hover:scale-105"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                  disabled={app.status !== "pronto"}
                >
                  <Download className="w-4 h-4 inline mr-1" /> Baixar
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold border border-border text-foreground hover:border-secondary transition-all">
                  <Eye className="w-4 h-4 inline mr-1" /> Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default DashboardSection;
