import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import ConverterSection from "@/components/ConverterSection";
import PricingSection from "@/components/PricingSection";
import AISection from "@/components/AISection";
import ToolsSection from "@/components/ToolsSection";
import FooterSection from "@/components/FooterSection";

const HowItWorks = () => (
  <section id="como-funciona" className="py-20 px-4">
    <div className="max-w-4xl mx-auto text-center">
      <h2 className="text-3xl md:text-5xl font-display font-bold text-gradient-cyan mb-16">
        Como funciona
      </h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { step: "1", title: "Cole a URL", desc: "Insira o endereço do seu site" },
          { step: "2", title: "Escolha o formato", desc: "APK, AAB ou PWA" },
          { step: "3", title: "Gere o app", desc: "Clique e aguarde a mágica" },
          { step: "4", title: "Baixe e publique", desc: "Pronto para a Play Store" },
        ].map((item) => (
          <div key={item.step} className="text-center">
            <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground font-display font-bold text-xl flex items-center justify-center mx-auto mb-4 glow-gold">
              {item.step}
            </div>
            <h3 className="font-display font-bold text-foreground mb-2">{item.title}</h3>
            <p className="text-muted-foreground text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <BenefitsSection />
    <HowItWorks />
    <ConverterSection />
    <PricingSection />
    <AISection />
    <ToolsSection />
    <FooterSection />
  </div>
);

export default Index;
