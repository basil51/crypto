'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  // Don't render form if already authenticated (redirect will happen)
  if (isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const testUsers = [
    { email: 'admin@test.com', password: 'password123', role: 'ADMIN', plan: 'PRO' },
    { email: 'user@test.com', password: 'password123', role: 'USER', plan: 'FREE' },
    { email: 'pro@test.com', password: 'password123', role: 'USER', plan: 'PRO' },
  ];

  const fillCredentials = (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Or{' '}
            <Link href="/register" className="font-medium text-purple-400 hover:text-purple-300 transition-colors">
              create a new account
            </Link>
          </p>
        </div>

        {/* Test Users Section */}
        <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-4">
          <h3 className="text-sm font-semibold text-purple-400 mb-3">🧪 Test Accounts</h3>
          <div className="space-y-2">
            {testUsers.map((user) => (
              <div
                key={user.email}
                className="bg-black/40 border border-purple-500/30 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white mb-1">{user.email}</div>
                    <div className="text-xs text-gray-400">
                      <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded mr-1 border border-purple-500/30">{user.role}</span>
                      <span className="inline-block px-2 py-0.5 bg-green-500/20 text-green-400 rounded border border-green-500/30">{user.plan}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => fillCredentials(user.email, user.password)}
                    className="ml-2 px-3 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    title="Click to fill form"
                  >
                    Fill
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-500/20">
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Email:</div>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-black/40 border border-purple-500/30 px-2 py-1 rounded flex-1 font-mono text-white">{user.email}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(user.email, 'email');
                        }}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-purple-500/20 rounded"
                        title="Copy email"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">Password:</div>
                    <div className="flex items-center gap-1">
                      <code className="text-xs bg-black/40 border border-purple-500/30 px-2 py-1 rounded flex-1 font-mono text-white">{user.password}</code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(user.password, 'password');
                        }}
                        className="px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-purple-500/20 rounded"
                        title="Copy password"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-purple-400 mt-3">💡 Click "Fill" to auto-fill or use 📋 to copy credentials</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          <div className="rounded-xl -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-t-xl relative block w-full px-4 py-3 border border-purple-500/30 placeholder-gray-500 bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm transition-all"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-b-xl relative block w-full px-4 py-3 border border-purple-500/30 placeholder-gray-500 bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm transition-all"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

