
import { ArrowDown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const benefits = [
  'Professional templates ready to use',
  'AI-powered content generation',
  'Multi-format export capabilities',
  'Secure cloud storage',
  'Mobile-responsive design',
  'Team collaboration features'
];

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24">
      <div className="container-app">
        <div className="max-w-4xl mx-auto">
          <div className="card-swiss p-12 text-center bg-gradient-to-br from-background to-muted/30">
            <h2 className="text-4xl font-semibold tracking-tight mb-6">
              Ready to streamline your invoicing?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join defense suppliers who trust InvoiceGen for their professional documentation needs.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center text-left">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="btn-primary h-12 px-8 text-base"
                onClick={() => navigate('/auth')}
              >
                Start Free Trial
                <ArrowDown className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Schedule Demo
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-6">
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
