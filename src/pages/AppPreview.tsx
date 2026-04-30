import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, Share2, Smartphone, MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import { AppSimulation, appExamples } from "@/components/AppExamplesSection";
import { analytics } from "@/lib/analytics";

const SITE_URL = "https://aurorabuild.com.br";
const OG_IMAGE_URL = `${SITE_URL}/og-image.png`;

const upsertHeadTag = (selector: string, createElement: () => HTMLMetaElement | HTMLLinkElement, contentKey: "content" | "href", value: string) => {
  const element = document.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  const target = element ?? createElement();
  const previousValue = target.getAttribute(contentKey);

  if (!element) document.head.appendChild(target);
  target.setAttribute(contentKey, value);

  return () => {
    if (!element) {
      target.remove();
      return;
    }

    if (previousValue) target.setAttribute(contentKey, previousValue);
  };
};

const AppPreview = () => {
  const { slug } = useParams();
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

  const app = useMemo(() => appExamples.find((example) => example.slug === slug), [slug]);
  const currentUrl = app ? `${SITE_URL}/preview/${app.slug}` : `${SITE_URL}/preview/${slug ?? ""}`;
  const shareText = app ? `Veja este exemplo de app: ${app.name} — Aurora Build AI` : "Veja este exemplo de app da Aurora Build AI";
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${currentUrl}`)}`;

  useEffect(() => {
    if (!app) return;

    const title = `${app.name} em app | Aurora Build AI`;
    const description = `Veja o preview de ${app.name} criado com a Aurora Build AI e transforme seu site em app profissional em minutos.`;
    const previousTitle = document.title;
    document.title = title;

    const cleanups = [
      upsertHeadTag('meta[name="description"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        return tag;
      }, "content", description),
      upsertHeadTag('link[rel="canonical"]', () => {
        const tag = document.createElement("link");
        tag.setAttribute("rel", "canonical");
        return tag;
      }, "href", currentUrl),
      upsertHeadTag('meta[property="og:title"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("property", "og:title");
        return tag;
      }, "content", title),
      upsertHeadTag('meta[property="og:description"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("property", "og:description");
        return tag;
      }, "content", description),
      upsertHeadTag('meta[property="og:url"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("property", "og:url");
        return tag;
      }, "content", currentUrl),
      upsertHeadTag('meta[property="og:type"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("property", "og:type");
        return tag;
      }, "content", "website"),
      upsertHeadTag('meta[property="og:image"]', () => {
        const tag = document.createElement("meta");
        tag.setAttribute("property", "og:image");
        return tag;
      }, "content", OG_IMAGE_URL),
    ];

    return () => {
      document.title = previousTitle;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [app, currentUrl]);

  const copyLink = async () => {
    if (!app) return;

    analytics.previewCopyLinkClicked(app.slug, app.name, "clicked");

    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopyStatus("copied");
      analytics.previewCopyLinkClicked(app.slug, app.name, "success");
    } catch (error) {
      console.error("Erro ao copiar link do preview", error);
      setCopyStatus("error");
      analytics.previewCopyLinkClicked(app.slug, app.name, "error");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  };

  const sharePreview = async () => {
    try {
      if (navigator.share && app) {
        await navigator.share({ title: app.name, text: shareText, url: currentUrl });
        return;
      }

      await copyLink();
    } catch (error) {
      console.error("Erro ao compartilhar preview", error);
    }
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
                onClick={() => analytics.previewCreateAppClicked(app.slug, app.name, "page")}
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
                <Copy className="h-4 w-4" /> {copyStatus === "copied" ? "Link copiado" : copyStatus === "error" ? "Tente novamente" : "Copiar link"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AppPreview;