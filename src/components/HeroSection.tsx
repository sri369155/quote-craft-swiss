
import { ArrowDown, Sparkles, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HeroSection = () => {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="container-app">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-secondary/50 border border-border mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-primary" />
            <span className="text-sm font-medium">AI-Powered Invoice Generation</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-semibold tracking-tight mb-8 text-balance">
            Professional
            <span className="block text-muted-foreground">Quotations & Invoices</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-balance leading-relaxed">
            Generate stunning quotations and invoices for defense suppliers with AI-powered autofill, 
            professional templates, and seamless export capabilities.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button size="lg" className="btn-primary h-12 px-8 text-base">
              Start Creating
              <ArrowDown className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              View Demo
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">AI-Powered</h3>
              <p className="text-sm text-muted-foreground">
                Automatically fill item details and scope from raw text using OpenAI
              </p>
            </div>
            
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Defense Ready</h3>
              <p className="text-sm text-muted-foreground">
                Built specifically for defense suppliers with compliance features
              </p>
            </div>
            
            <div className="text-center animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Export Ready</h3>
              <p className="text-sm text-muted-foreground">
                Export to Word, PDF with professional templates and branding
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Background Elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-secondary/30 rounded-full blur-2xl" />
      </div>
    </section>
  );
};

export default HeroSection;
