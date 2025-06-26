
import React from 'react';

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
        <a href="/auth" className="bg-white text-primary hover:bg-gray-100 btn-swiss h-12 px-8 text-lg">
          Start Free Trial
        </a>
      </div>
    </section>
  );
};

export default CTASection;
