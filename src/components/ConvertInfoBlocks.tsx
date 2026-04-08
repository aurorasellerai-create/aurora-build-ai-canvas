import { motion } from "framer-motion";
import {
  AlertTriangle, ArrowRight, CheckCircle2, Clock, FileWarning,
  Globe, Rocket, Shield, Smartphone, Sparkles, Zap
} from "lucide-react";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const ConvertInfoBlocks = () => (
  <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

    {/* 1. ALERTA PLAY STORE */}
    <motion.div variants={item} className="p-4 rounded-xl border border-destructive/30 bg-destructive/5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <h3 className="font-display font-bold text-sm text-foreground mb-1">⚠️ Atenção — Play Store NÃO aceita APK</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Se você tentar publicar um APK, seu app será <strong className="text-destructive">recusado automaticamente</strong>.
            A Google Play exige o formato <strong className="text-primary">AAB (Android App Bundle)</strong>.
          </p>
          <p className="text-xs text-primary font-semibold mt-2 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Sempre use AAB para publicação.
          </p>
        </div>
      </div>
    </motion.div>

    {/* 2. QUANDO USAR CADA OPÇÃO */}
    <motion.div variants={item} className="p-4 rounded-xl border border-border bg-muted/20">
      <h3 className="font-display font-bold text-xs text-foreground mb-3 flex items-center gap-2">
        <Smartphone className="w-4 h-4 text-primary" /> Quando usar cada opção
      </h3>
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">APK → AAB</p>
            <p className="text-xs text-muted-foreground">Quando você já tem um APK e quer publicar na Play Store</p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
          <CheckCircle2 className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-foreground">AAB → APK</p>
            <p className="text-xs text-muted-foreground">Quando você quer testar o app no seu celular</p>
          </div>
        </div>
        <div className="relative flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/30">
          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
            Novo
          </span>
          <Globe className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-primary">Link → AAB ✨</p>
            <p className="text-xs text-muted-foreground">
              Quando você tem um site ou app online e quer transformar em aplicativo Android pronto para publicação
            </p>
          </div>
        </div>
      </div>
    </motion.div>

    {/* 3. COMO FUNCIONA */}
    <motion.div variants={item} className="p-4 rounded-xl border border-border bg-muted/20">
      <h3 className="font-display font-bold text-xs text-foreground mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" /> Como funciona
      </h3>
      <div className="space-y-2">
        {[
          "Cole o link do seu app",
          "Clique em \"Converter\"",
          "O sistema processa automaticamente",
          "Seu AAB será gerado",
          "Baixe e publique na Play Store",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0">
              {i + 1}
            </span>
            <span className="text-xs text-muted-foreground">{step}</span>
          </div>
        ))}
      </div>
    </motion.div>

    {/* 4. TEMPO */}
    <motion.div variants={item} className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
      <Clock className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-xs font-semibold text-foreground">Tempo de processamento</p>
        <p className="text-xs text-muted-foreground">O processo pode levar de <strong className="text-foreground">30 segundos</strong> até <strong className="text-foreground">2 minutos</strong>, dependendo do tamanho do app.</p>
      </div>
    </motion.div>

    {/* 5. POSSÍVEIS ERROS */}
    <motion.div variants={item} className="p-4 rounded-xl border border-border bg-muted/20">
      <h3 className="font-display font-bold text-xs text-foreground mb-3 flex items-center gap-2">
        <FileWarning className="w-4 h-4 text-destructive" /> Possíveis erros
      </h3>
      <p className="text-xs text-muted-foreground mb-2">O app pode não converter corretamente se:</p>
      <div className="space-y-1.5">
        {[
          "O site estiver bloqueado (CORS / proteção)",
          "O link estiver inválido ou fora do ar",
          "O conteúdo não carregar corretamente no mobile",
        ].map((err, i) => (
          <div key={i} className="flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground">{err}</span>
          </div>
        ))}
      </div>
    </motion.div>

    {/* 6. DIFERENCIAL */}
    <motion.div variants={item} className="p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <h3 className="font-display font-bold text-xs text-foreground mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" /> Diferencial Aurora Build AI
      </h3>
      <div className="space-y-2">
        {[
          "Você não precisa configurar nada",
          "Tudo é feito automaticamente",
          "App pronto para publicação na Play Store",
          "Interface profissional e otimizada",
        ].map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <Rocket className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs text-muted-foreground">{d}</span>
          </div>
        ))}
      </div>
    </motion.div>

    {/* 7. FORMATO AAB */}
    <motion.div variants={item} className="p-4 rounded-xl border border-primary/20 bg-primary/5">
      <h3 className="font-display font-bold text-xs text-foreground flex items-center gap-2 mb-2">
        <Shield className="w-4 h-4 text-primary" /> Formato AAB
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        O formato <strong className="text-primary">AAB (Android App Bundle)</strong> é o formato oficial exigido pela Google Play Store.
        Apps em AAB são otimizados automaticamente para cada dispositivo, resultando em downloads menores e melhor performance.
      </p>
    </motion.div>

    {/* 8. CTA FINAL — RESULTADO */}
    <motion.div variants={item} className="p-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/10 text-center space-y-5">
      <h3 className="font-display font-bold text-lg text-foreground leading-snug">
        🚀 Transforme seu projeto em um produto<br />
        <span className="text-primary">pronto para faturar</span>
      </h3>

      <div className="grid grid-cols-2 gap-2">
        {[
          "Sem erros",
          "Sem complicação",
          "Sem dor de cabeça",
          "Apenas resultado",
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 justify-center text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
            {t}
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">🔥 O que muda na prática:</p>
        {[
          "Publicando na Play Store",
          "Escalando seu app",
          "Gerando vendas reais",
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {t}
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">💡 Por que é diferente?</p>
        {[
          "Você não precisa configurar nada",
          "Não precisa entender de código",
          "Não precisa instalar Android Studio",
          "Tudo acontece automaticamente",
        ].map((t, i) => (
          <div key={i} className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary shrink-0" /> {t}
          </div>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">⚡ Simples assim:</p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">1. Cole o link</span>
          <ArrowRight className="w-3 h-3 text-primary" />
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">2. Converta</span>
          <ArrowRight className="w-3 h-3 text-primary" />
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-semibold">3. Publique</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-1">
        {["Processo validado", "Pronto para Play Store", "Estrutura profissional"].map((t, i) => (
          <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3 text-primary" /> {t}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        💰 Cada app que você publica é uma <strong className="text-foreground">nova fonte de renda</strong>. E agora você pode fazer isso em <strong className="text-primary">minutos</strong>.
      </p>

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="w-full py-4 bg-primary text-primary-foreground font-display font-bold text-base rounded-lg glow-gold glow-gold-hover transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
      >
        <Rocket className="w-5 h-5" /> Converter agora
      </button>
    </motion.div>
  </motion.div>
);
export default ConvertInfoBlocks;