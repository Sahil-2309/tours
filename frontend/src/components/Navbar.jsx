import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Templates' },
    { path: '/wordpress', label: 'WordPress' },
    { path: '/woocommerce', label: 'WooCommerce' },
    { path: '/process', label: 'Process' },
    { path: '/history', label: 'History' },
  ];

  return (
    <nav className="bg-slate-900/95 border-b border-slate-700 sticky top-0 z-50 shadow-sm backdrop-blur-md">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link
            to="/"
            className="flex items-center space-x-3 group hover:opacity-90 transition-opacity duration-300"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-poppins font-bold text-slate-100">TourSync</h1>
              <p className="text-xs text-slate-400">Content Automation</p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center space-x-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                  isActive(link.path)
                    ? 'text-cyan-300 bg-slate-800'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-2xl focus:outline-none transition-all duration-300 hover:bg-slate-800 p-2 rounded-lg text-slate-200"
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden pb-4 space-y-1 animate-slide-up">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
                  isActive(link.path)
                    ? 'text-cyan-300 bg-slate-800'
                    : 'text-slate-300 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
