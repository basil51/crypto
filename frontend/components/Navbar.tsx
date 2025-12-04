'use client';

import Link from 'next/link';
import { TrendingUp, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import NotificationBell from './NotificationBell';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Get display name from email (part before @)
  const getUserDisplayName = () => {
    if (!user?.email) return 'User';
    return user.email.split('@')[0];
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

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
                <div 
                  className="relative"
                  ref={userMenuRef}
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <div className="flex items-center gap-2 cursor-pointer py-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-white font-medium hidden sm:block">
                      Hi, {getUserDisplayName()}
                    </span>
                  </div>
                  
                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full pt-1 w-56 z-50">
                      <div className="bg-black/95 backdrop-blur-xl border border-purple-500/20 rounded-lg shadow-xl overflow-hidden">
                      <div className="py-2">
                        {/* Welcome Section */}
                        <div className="px-4 py-3 border-b border-white/10">
                          <p className="text-xs text-gray-400 mb-1">Welcome</p>
                          <p className="text-sm font-semibold text-white">{getUserDisplayName()}</p>
                        </div>
                        
                        {/* Sign Out */}
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition"
                        >
                          Sign Out
                        </button>
                        
                        {/* Separator */}
                        <div className="my-1 border-t border-white/10"></div>
                        
                        {/* Profile Link */}
                        <Link
                          href="/profile"
                          className="block px-4 py-2 text-sm text-white hover:bg-white/5 transition"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          Profile
                        </Link>
                        
                        {/* Space for future items */}
                        {/* Add more user account related items here */}
                      </div>
                      </div>
                    </div>
                  )}
                </div>
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

