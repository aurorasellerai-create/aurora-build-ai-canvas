import HeroSection from "@/components/HeroSection";
import BenefitsSection from "@/components/BenefitsSection";
import ConverterSection from "@/components/ConverterSection";
import DashboardSection from "@/components/DashboardSection";
import PricingSection from "@/components/PricingSection";
import AISection from "@/components/AISection";
import ToolsSection from "@/components/ToolsSection";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <BenefitsSection />
      <ConverterSection />
      <DashboardSection />
      <PricingSection />
      <AISection />
      <ToolsSection />
      <FooterSection />
    </div>
  );
};

export default Index;
