import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WhatYouCreateSection from "@/components/WhatYouCreateSection";
import WhyItWorksSection from "@/components/WhyItWorksSection";
import DifferentialSection from "@/components/DifferentialSection";
import ProductFeaturesSection from "@/components/ProductFeaturesSection";
import FormatGuideSection from "@/components/FormatGuideSection";
import PublishGuideSection from "@/components/PublishGuideSection";
import ViralSection from "@/components/ViralSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import PricingSection from "@/components/PricingSection";
import FinalCTASection from "@/components/FinalCTASection";
import FooterSection from "@/components/FooterSection";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <HeroSection />
    <WhatYouCreateSection />
    <ProductFeaturesSection />
    <WhyItWorksSection />
    <DifferentialSection />
    <FormatGuideSection />
    <PublishGuideSection />
    <ViralSection />
    <TestimonialsSection />
    <PricingSection />
    <FinalCTASection />
    <FooterSection />
  </div>
);

export default Index;
