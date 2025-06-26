
import React from 'react';

const HeroSection = () => {
  return (
    <section className="bg-white py-20">
      <div className="container-app text-center">
        <h1 className="text-5xl font-bold mb-6 text-gray-900">
          Professional Quotations Made Simple
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create, manage, and send professional quotations with ease. 
          Streamline your business workflow with our intuitive platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auth" className="btn-primary">Get Started</a>
          <a href="#features" className="btn-outline">Learn More</a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
