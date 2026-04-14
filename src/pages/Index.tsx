import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PainSection from "@/components/PainSection";
import SolutionSection from "@/components/SolutionSection";
import WhatYouCreateSection from "@/components/WhatYouCreateSection";
import WhyItWorksSection from "@/components/WhyItWorksSection";
import ProductFeaturesSection from "@/components/ProductFeaturesSection";
import DifferentialSection from "@/components/DifferentialSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import AIToolsSection from "@/components/AIToolsSection";
import CreditsInfoSection from "@/components/CreditsInfoSection";
import FAQSection from "@/components/FAQSection";
import FinalCTASection from "@/components/FinalCTASection";
import FooterSection from "@/components/FooterSection";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      {/* 1. HERO — Promessa + CTA acima da dobra */}
      <HeroSection />
      {/* 2. DOR — Identificação emocional */}
      <PainSection />
      {/* 3. SOLUÇÃO — Como funciona (3 passos) + CTA */}
      <SolutionSection />
      {/* 4. O QUE VOCÊ CRIA — Tipos de app */}
      <WhatYouCreateSection />
      {/* 5. ANTES vs DEPOIS — Transformação */}
      <WhyItWorksSection />
      {/* 6. FEATURES — Funcionalidades detalhadas + CTA */}
      <ProductFeaturesSection />
      {/* 7. DIFERENCIAIS — Por que a Aurora é única */}
      <DifferentialSection />
      {/* 8. PROVA SOCIAL — Depoimentos com resultados */}
      <TestimonialsSection />
      {/* 9. PREÇOS — Planos + CTA de compra */}
      <PricingSection />
      {/* 10. FERRAMENTAS IA — Grid completo */}
      <AIToolsSection />
      {/* 11. CRÉDITOS — Como funciona */}
      <CreditsInfoSection />
      {/* 12. FAQ — SEO + quebra de objeções */}
      <FAQSection />
      {/* 13. CTA FINAL — Urgência + último push */}
      <FinalCTASection />
    </main>
    <FooterSection />
  </div>
);

export default Index;
