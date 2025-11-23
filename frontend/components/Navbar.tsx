'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 backdrop-blur-md bg-opacity-95 border-b border-purple-500/30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex items-center px-2 py-2 text-xl font-bold text-white hover:text-purple-300 transition-colors">
              Crypto Signals
            </Link>
            {isAuthenticated && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/tokens"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Tokens
                </Link>
                <Link
                  href="/alerts"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Alerts
                </Link>
                <Link
                  href="/whales"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Whales
                </Link>
                <Link
                  href="/sell-walls"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Sell Walls
                </Link>
                <Link
                  href="/billing"
                  className="border-transparent text-gray-300 hover:text-white hover:border-purple-400 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors"
                >
                  Billing
                </Link>
              </div>
            )}
          </div>
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-200 font-medium">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

