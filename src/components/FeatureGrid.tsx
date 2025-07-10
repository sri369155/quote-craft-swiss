
import React from 'react';

const FeatureGrid = () => {
  const features = [
    {
      title: "Quick Creation",
      description: "Create professional quotations in minutes with our intuitive builder."
    },
    {
      title: "Customer Management", 
      description: "Keep track of all your customers and their quotation history."
    },
    {
      title: "PDF Export",
      description: "Export your quotations as professional PDF documents."
    },
    {
      title: "Responsive Design",
      description: "Access your quotations from any device, anywhere."
    }
  ];

  return (
    <section id="features" className="bg-gray-50 py-20">
      <div className="container-app">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="gradient-card p-6 text-center">
              <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
              <p className="text-white/80">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureGrid;
