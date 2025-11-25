'use client';

import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <nav className="fixed top-0 w-full bg-black/40 backdrop-blur-xl border-b border-purple-500/20 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white hover:text-purple-400 transition">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span>SmartFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-white hover:text-purple-400 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/alpha-screener"
                  className="text-white hover:text-purple-400 transition"
                >
                  Alpha Screener
                </Link>
                <Link
                  href="/tokens"
                  className="text-white hover:text-purple-400 transition"
                >
                  Tokens
                </Link>
                <Link
                  href="/whales"
                  className="text-white hover:text-purple-400 transition"
                >
                  Whales
                </Link>
                <Link
                  href="/alerts"
                  className="text-white hover:text-purple-400 transition"
                >
                  Alerts
                </Link>
                <Link
                  href="/sell-walls"
                  className="text-white hover:text-purple-400 transition"
                >
                  Sell Walls
                </Link>
                <Link
                  href="/notifications"
                  className="text-white hover:text-purple-400 transition"
                >
                  Notifications
                </Link>
                <Link
                  href="/billing"
                  className="text-white hover:text-purple-400 transition"
                >
                  Billing
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="text-white hover:text-purple-400 transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/alpha-screener"
                  className="text-white hover:text-purple-400 transition"
                >
                  Alpha Screener
                </Link>
                <Link
                  href="/tokens"
                  className="text-white hover:text-purple-400 transition"
                >
                  Tokens
                </Link>
                <Link
                  href="/whales"
                  className="text-white hover:text-purple-400 transition"
                >
                  Whales
                </Link>
                <Link
                  href="/billing"
                  className="text-white hover:text-purple-400 transition"
                >
                  Pricing
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <NotificationBell />
                <span className="text-sm text-white font-medium hidden sm:block">{user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-red-500/50 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-white hover:text-purple-400 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold text-white hover:shadow-lg hover:shadow-purple-500/50 transition"
                >
                  Start Free Trial
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

