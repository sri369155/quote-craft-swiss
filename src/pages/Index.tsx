import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeatureGrid from '@/components/FeatureGrid';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground" style={{ background: 'var(--gradient-background)' }}>
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
