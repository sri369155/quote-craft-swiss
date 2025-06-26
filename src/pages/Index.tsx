
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeatureGrid from '@/components/FeatureGrid';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-green-100">
      <Header />
      <main>
        <HeroSection />
        <FeatureGrid />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
