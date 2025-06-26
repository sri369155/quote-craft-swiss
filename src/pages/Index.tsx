
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import FeatureGrid from '@/components/FeatureGrid';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

const Index = () => {
  console.log('Index component is rendering');
  
  return (
    <div className="min-h-screen bg-white">
      <div className="bg-red-500 p-4 text-white">
        <h1>DEBUG: Index Page is Loading</h1>
      </div>
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
