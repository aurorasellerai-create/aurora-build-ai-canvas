import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";

// Lazy load below-fold sections to reduce initial bundle
const PainSection = lazy(() => import("@/components/PainSection"));
const SolutionSection = lazy(() => import("@/components/SolutionSection"));
const WhatYouCreateSection = lazy(() => import("@/components/WhatYouCreateSection"));
const WhyItWorksSection = lazy(() => import("@/components/WhyItWorksSection"));
const ProductFeaturesSection = lazy(() => import("@/components/ProductFeaturesSection"));
const DifferentialSection = lazy(() => import("@/components/DifferentialSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const PricingSection = lazy(() => import("@/components/PricingSection"));
const AIToolsSection = lazy(() => import("@/components/AIToolsSection"));
const CreditsInfoSection = lazy(() => import("@/components/CreditsInfoSection"));
const FAQSection = lazy(() => import("@/components/FAQSection"));
const FinalCTASection = lazy(() => import("@/components/FinalCTASection"));
const FooterSection = lazy(() => import("@/components/FooterSection"));

const SectionFallback = () => (
  <div className="py-20 flex justify-center">
    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>
      <HeroSection />
      <Suspense fallback={<SectionFallback />}>
        <PainSection />
        <SolutionSection />
        <WhatYouCreateSection />
        <WhyItWorksSection />
        <ProductFeaturesSection />
        <DifferentialSection />
        <TestimonialsSection />
        <PricingSection />
        <AIToolsSection />
        <CreditsInfoSection />
        <FAQSection />
        <FinalCTASection />
      </Suspense>
    </main>
    <Suspense fallback={null}>
      <FooterSection />
    </Suspense>
  </div>
);

export default Index;
