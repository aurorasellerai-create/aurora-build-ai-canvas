import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const ConverterSection = () => {
  const [format, setFormat] = useState("apk");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsGenerating(false), 1000);
          return 100;
        }
        return p + 2;
      });
    }, 80);
  };

  return (
    <section className="py-20 px-4" id="converter">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-5xl font-display font-bold text-center text-gradient-gold mb-16"
        >
          Crie seu app agora
        </motion.h2>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Form */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-aurora space-y-6"
          >
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-2">URL do site</label>
              <input
                type="url"
                placeholder="https://meusite.com"
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-2">Nome do app</label>
              <input
                type="text"
                placeholder="Meu App Incrível"
                className="w-full px-4 py-3 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-muted-foreground mb-3">Formato</label>
              <div className="flex gap-4">
                {["apk", "aab", "pwa"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-6 py-2 rounded-lg font-display font-semibold text-sm uppercase transition-all duration-300 ${
                      format === f
                        ? "bg-primary text-primary-foreground glow-gold"
                        : "bg-muted text-muted-foreground border border-border hover:border-secondary"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-lg rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {isGenerating ? "Gerando..." : "Gerar App"}
            </button>
          </motion.div>

          {/* Right - Progress */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-aurora flex flex-col items-center justify-center min-h-[300px]"
          >
            {isGenerating ? (
              <div className="w-full space-y-6 text-center">
                <Loader2 className="w-16 h-16 text-primary mx-auto animate-spin" />
                <h3 className="font-display text-xl font-bold text-foreground">
                  Gerando seu app...
                </h3>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, hsl(190 100% 50%), hsl(51 100% 50%))",
                      width: `${progress}%`,
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  {progress < 30
                    ? "Analisando o site..."
                    : progress < 60
                    ? "Construindo o app..."
                    : progress < 90
                    ? "Otimizando..."
                    : "Finalizando!"}
                </p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 rounded-full border-2 border-border flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Preencha os dados e clique em <span className="text-primary font-semibold">Gerar App</span>
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ConverterSection;
