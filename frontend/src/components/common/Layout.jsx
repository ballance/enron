import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import SearchBar from './SearchBar';

const navigation = [
  { name: 'Dashboard', path: '/' },
  { name: 'Network', path: '/network' },
  { name: 'Timeline', path: '/timeline' },
  { name: 'Threads', path: '/threads' },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4 gap-6">
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Enron Logo */}
              <Link to="/" className="flex-shrink-0">
                <img
                  src="/enron-logo.svg"
                  alt="Enron"
                  className="h-10 w-auto"
                />
              </Link>

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* Title */}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Email Dataset Visualization
                </h1>
                <p className="text-xs text-gray-500">Historical Analysis Tool</p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <SearchBar />
            </div>

            {/* Navigation */}
            <nav className="flex space-x-4 flex-shrink-0">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Enron Email Dataset Visualization - 517K messages, 87K people, 127K threads
          </p>
        </div>
      </footer>
    </div>
  );
}
