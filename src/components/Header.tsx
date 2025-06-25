
import { Menu, FileText, History, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Header = () => {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg tracking-tight">InvoiceGen</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-1">
              <Button variant="ghost" className="h-9 px-4 text-sm font-medium">
                Dashboard
              </Button>
              <Button variant="ghost" className="h-9 px-4 text-sm font-medium">
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex">
              <User className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button size="sm" className="btn-primary">
              Get Started
            </Button>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
