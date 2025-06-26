
import React from 'react';

const Header = () => {
  return (
    <header className="bg-green-100 shadow-sm border-b">
      <div className="container-app py-4">
        <nav className="flex items-center justify-between">
          <div className="text-xl font-bold">QuoteCraft</div>
          <div className="flex items-center space-x-6">
            <a href="/auth" className="btn-primary">Sign In</a>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
