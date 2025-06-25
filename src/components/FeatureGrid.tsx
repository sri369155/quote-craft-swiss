
import { 
  FileText, 
  Smartphone, 
  Download, 
  Eye, 
  Calculator, 
  Image,
  Users,
  Database
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Smart Form Generation',
    description: 'Intelligent forms that adapt to your input with real-time validation and suggestions.'
  },
  {
    icon: Smartphone,
    title: 'Mobile Responsive',
    description: 'Perfect experience on all devices with touch-optimized controls and layouts.'
  },
  {
    icon: Download,
    title: 'Multiple Export Formats',
    description: 'Export to Word, PDF, or print directly with professional formatting.'
  },
  {
    icon: Eye,
    title: 'Live Preview',
    description: 'See your invoice as you build it with real-time preview functionality.'
  },
  {
    icon: Calculator,
    title: 'Automatic Calculations',
    description: 'GST, totals, and amounts in words calculated automatically with precision.'
  },
  {
    icon: Image,
    title: 'Custom Branding',
    description: 'Add your headers, footers, and signatures with easy image management.'
  },
  {
    icon: Users,
    title: 'Multi-User Support',
    description: 'Team collaboration with user management and role-based permissions.'
  },
  {
    icon: Database,
    title: 'Secure Storage',
    description: 'All your invoices stored securely with easy search and retrieval.'
  }
];

const FeatureGrid = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container-app">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-semibold tracking-tight mb-4">
            Everything you need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive tools designed for professional invoice and quotation generation
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="card-swiss p-6 hover:shadow-md transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
