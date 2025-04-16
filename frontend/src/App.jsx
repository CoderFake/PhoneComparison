import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { useInView } from 'react-intersection-observer';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import ProductComparison from './components/ProductComparison';
import ChatBot from './components/ChatBot';

const App = () => {
  const [darkMode, setDarkMode] = useState(false);
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Animated gradient header */}
      <header className="bg-gradient-animated py-6">
        <div className="container-responsive">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-white text-2xl font-bold flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Phone Price Comparison
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/" className="text-white hover:text-gray-200 transition-colors">Home</Link>
              <Link to="/compare" className="text-white hover:text-gray-200 transition-colors">Compare</Link>
              <Link to="/chat" className="text-white hover:text-gray-200 transition-colors">AI Assistant</Link>
            </nav>
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full bg-white bg-opacity-20 text-white hover:bg-opacity-30 transition-all"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className="md:hidden bg-white dark:bg-gray-800 shadow-md">
        <div className="container-responsive py-2">
          <div className="flex justify-between space-x-4">
            <Link to="/" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              Home
            </Link>
            <Link to="/compare" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              Compare
            </Link>
            <Link to="/chat" className="px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">
              AI Assistant
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="container-responsive py-8">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/compare" element={<ProductComparison />} />
          <Route path="/chat" element={<ChatBot />} />
        </Routes>
      </main>

      {/* Animated footer with gradient */}
      <footer ref={ref} className={`bg-gradient-blue-purple py-8 text-white ${inView ? 'fade-in' : 'opacity-0'}`}>
        <div className="container-responsive">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Phone Price Comparison</h3>
              <p className="text-sm opacity-80">
                Compare prices and features of smartphones across different retailers to find the best deals.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="opacity-80 hover:opacity-100 transition-opacity">Home</Link></li>
                <li><Link to="/compare" className="opacity-80 hover:opacity-100 transition-opacity">Compare Phones</Link></li>
                <li><Link to="/chat" className="opacity-80 hover:opacity-100 transition-opacity">AI Assistant</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-sm opacity-80">
                Have questions or feedback? Reach out to us.
              </p>
              <div className="mt-4 flex space-x-4">
                <a href="#" className="text-white hover:text-gray-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </a>
                <a href="#" className="text-white hover:text-gray-200 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-white border-opacity-20 text-center text-sm opacity-70">
            <p>© {new Date().getFullYear()} Phone Price Comparison. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
