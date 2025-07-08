import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeatureGrid from '@/components/FeatureGrid';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFE2D1] via-[#FCE4EC] to-[#E0C3FC] text-gray-800">
      <Header />
      <main className="max-w-6xl mx-auto px-4">
        <HeroSection />
        <FeatureGrid />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
