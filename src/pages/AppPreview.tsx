import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Share2, Smartphone, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { AppSimulation, appExamples } from "@/components/AppExamplesSection";

const AppPreview = () => {
  const { slug } = useParams();
  const [copied, setCopied] = useState(false);

  const app = useMemo(() => appExamples.find((example) => example.slug === slug), [slug]);
  const currentUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = app ? `Veja este exemplo de app: ${app.name} — Aurora Build AI` : "Veja este exemplo de app da Aurora Build AI";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const sharePreview = async () => {
    if (navigator.share && app) {
      await navigator.share({ title: app.name, text: shareText, url: currentUrl });
      return;
    }

    await copyLink();
  };

  if (!app) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="px-4 py-28 text-center">
          <h1 className="font-display text-3xl font-bold text-gradient-gold">Preview não encontrado</h1>
          <Link to="/#exemplos-apps" className="mt-6 inline-flex rounded-2xl bg-primary px-6 py-3 font-display font-bold text-primary-foreground">
            Ver exemplos de apps
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="px-4 pb-20 pt-28">
        <section className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-xs font-bold text-accent">
              <Smartphone className="h-4 w-4" /> Preview compartilhável
            </div>
            <h1 className="font-display text-3xl font-bold text-gradient-gold md:text-5xl">{app.name}</h1>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{app.description}</p>
          </div>

          <div className="rounded-xl border border-accent/20 bg-card/70 p-4 md:p-6">
            <AppSimulation app={app} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div className="rounded-xl border border-border bg-card/60 p-5">
              <h2 className="font-display text-lg font-bold text-foreground">Funcionalidades do exemplo</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {[...app.screenLines, ...app.items].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 shrink-0 text-primary" /> {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-3 md:min-w-[250px]">
              <Link
                to="/auth"
                className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-4 font-display font-bold text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.24)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_38px_hsl(var(--primary)/0.36)]"
              >
                Criar app como este
              </Link>
              <button
                type="button"
                onClick={sharePreview}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-bold text-accent transition-all hover:border-accent/55 hover:bg-accent/15"
              >
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition-all hover:border-primary/45 hover:bg-primary/15"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/20 px-5 py-3 text-sm font-bold text-foreground transition-all hover:bg-muted/35"
              >
                <Copy className="h-4 w-4" /> {copied ? "Link copiado" : "Copiar link"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AppPreview;