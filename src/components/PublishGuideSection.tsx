import { motion } from "framer-motion";
import { Store, Apple, ExternalLink, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function PublishGuideSection() {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">
            Publique seu aplicativo nas lojas
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            O Aurora cria seu app — você publica onde quiser
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Google Play */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-aurora p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Store className="w-6 h-6 text-primary" />
              <h3 className="font-display font-bold text-lg text-foreground">Google Play Store</h3>
            </div>
            <ul className="space-y-3 mb-4">
              {[
                "Aceita apenas arquivo AAB (não APK)",
                "Conta Google Developer necessária (US$ 25)",
                "Envie o AAB pelo Google Play Console",
                "Revisão leva de 1 a 7 dias",
                "Aprovação depende das políticas do Google",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="https://play.google.com/console"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-semibold"
            >
              Acessar Google Play Console <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>

          {/* Apple */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="card-aurora p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <Apple className="w-6 h-6 text-foreground" />
              <h3 className="font-display font-bold text-lg text-foreground">Apple App Store</h3>
            </div>
            <ul className="space-y-3 mb-4">
              {[
                "Necessário build iOS (IPA) — em breve no Aurora",
                "Conta Apple Developer necessária (US$ 99/ano)",
                "Envie pelo App Store Connect (Xcode)",
                "Revisão obrigatória pela Apple",
                "Processo pode levar de 1 a 14 dias",
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
              <Shield className="w-3 h-3" /> Suporte iOS em breve
            </span>
          </motion.div>
        </div>

        {/* Important Warnings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="p-6 rounded-xl border border-destructive/20 bg-destructive/5"
        >
          <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Importante antes de publicar
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "APK não é aceito na Google Play Store — use AAB",
              "Para publicar é necessário o formato AAB",
              "A publicação depende de aprovação do Google e Apple",
              "O Aurora Build AI não garante aprovação nas lojas",
              "Você é responsável pelas contas de desenvolvedor",
              "Leia as políticas de cada loja antes de enviar",
            ].map((t, i) => (
              <p key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-destructive shrink-0">•</span> {t}
              </p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          <Link
            to="/generator"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-105"
          >
            Criar meu app agora
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
