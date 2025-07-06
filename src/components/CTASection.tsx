
import React from 'react';
import { Link } from 'react-router-dom';

const CTASection = () => {
  return (
    <section className="bg-primary text-primary-foreground py-20">
      <div className="container-app text-center">
        <h2 className="text-3xl font-bold mb-6">
          Ready to streamline your quotation process?
        </h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of businesses already using QuoteCraft.
        </p>
        <Link to="/auth" className="bg-card text-primary hover:bg-accent hover:text-accent-foreground btn-swiss h-12 px-8 text-lg">
          Start Free Trial
        </Link>
      </div>
    </section>
  );
};

export default CTASection;
