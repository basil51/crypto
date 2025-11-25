'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: string;
}

interface Alert {
  id: string;
  signal?: {
    id: string;
    score?: number;
    signalType?: string;
    token?: Token;
    createdAt?: string;
  };
  token?: Token;
  channels: {
    telegram?: boolean;
    email?: boolean;
  };
  status: string;
  createdAt?: string | null;
  deliveredAt?: string | null;
}

export default function AlertsPage() {
  const { isPro } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [channels, setChannels] = useState({ telegram: false, email: false });
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'history'>('subscriptions');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [alertsData, tokensData] = await Promise.all([
        api.getMySubscriptions().catch(() => []), // Return empty array if fails
        api.getTokens({ active: true }).catch(() => []), // Return empty array if fails
      ]);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setTokens(Array.isArray(tokensData) ? tokensData : []);
      
      // Log for debugging
      if (tokensData.length === 0) {
        console.warn('No tokens found. Make sure the database is seeded.');
      }
    } catch (err: any) {
      console.error('Error loading alerts data:', err);
      setError(err.message || 'Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedToken) {
      setError('Please select a token');
      return;
    }

    if (!channels.telegram && !channels.email) {
      setError('Please select at least one notification channel');
      return;
    }

    try {
      await api.subscribeToAlerts(selectedToken, channels);
      setError('');
      setSelectedToken('');
      setChannels({ telegram: false, email: false });
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to subscribe');
    }
  };

  const handleUnsubscribe = async (tokenId: string) => {
    try {
      await api.unsubscribeFromAlerts(tokenId);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to unsubscribe');
    }
  };

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Watchlists & Alerts</h1>
              <p className="text-gray-300 text-lg">
                Manage your token watchlists and alert preferences
              </p>
            </div>

            {/* Tabs */}
            <div className="mb-6 border-b border-purple-500/20">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'subscriptions'
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  My Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'history'
                      ? 'border-purple-400 text-purple-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-500'
                  }`}
                >
                  Alert History
                </button>
              </nav>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {activeTab === 'subscriptions' && (
              <>
            {/* Subscribe Form */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Subscribe to Alerts</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Token
                  </label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isLoading || tokens.length === 0}
                  >
                    <option value="">
                      {isLoading 
                        ? 'Loading tokens...' 
                        : tokens.length === 0 
                        ? 'No tokens available (seed database first)' 
                        : 'Select a token'}
                    </option>
                    {tokens.map((token) => (
                      <option key={token.id} value={token.id}>
                        {token.symbol} ({token.chain})
                      </option>
                    ))}
                  </select>
                    {tokens.length === 0 && !isLoading && (
                      <p className="mt-1 text-xs text-gray-400">
                        💡 Run <code className="bg-black/40 px-1 rounded text-purple-400">pnpm db:seed</code> in the backend directory to seed tokens
                      </p>
                    )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={channels.telegram}
                        onChange={(e) =>
                          setChannels({ ...channels, telegram: e.target.checked })
                        }
                        className="rounded border-purple-500/30 bg-black/40 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">Telegram</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={channels.email}
                        onChange={(e) =>
                          setChannels({ ...channels, email: e.target.checked })
                        }
                        className="rounded border-purple-500/30 bg-black/40 text-purple-500 focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-300">Email</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSubscribe}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">My Watchlist</h2>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <p className="text-gray-400">You have no active subscriptions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-500/20">
                    <thead className="bg-purple-500/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Token
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Channels
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Subscribed
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {alerts.map((alert) => (
                        <tr key={alert.id} className="transition-colors hover:bg-purple-500/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {alert.signal?.token?.symbol || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-400">{alert.signal?.token?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {alert.channels.telegram && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                                  Telegram
                                </span>
                              )}
                              {alert.channels.email && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                  Email
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                alert.status === 'ACTIVE'
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            {formatDate(alert.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleUnsubscribe(alert.signal?.token?.id || '')}
                              className="text-red-400 hover:text-red-300 font-semibold hover:underline transition-colors"
                            >
                              Unsubscribe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
              </>
            )}

            {activeTab === 'history' && (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Alert History</h2>
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : alerts.length === 0 ? (
                  <p className="text-gray-400">No alert history yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-purple-500/20">
                      <thead className="bg-purple-500/10">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Token
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Signal
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Channels
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            Delivered
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-500/20">
                        {alerts.map((alert) => (
                          <tr key={alert.id} className="transition-colors hover:bg-purple-500/5">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {alert.signal?.token?.symbol || alert.token?.symbol || 'N/A'}
                              </div>
                              <div className="text-sm text-gray-400">
                                {alert.signal?.token?.name || alert.token?.name || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {alert.signal ? (
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {alert.signal.signalType || 'Accumulation'}
                                  </div>
                                  {alert.signal.score !== undefined && (
                                    <div className="text-sm text-gray-400">
                                      Score: {Number(alert.signal.score).toFixed(2)}
                                    </div>
                                  )}
                                  {alert.signal.id && (
                                    <Link
                                      href={`/signals/${alert.signal.id}`}
                                      className="text-xs text-purple-400 hover:text-purple-300"
                                    >
                                      View Signal →
                                    </Link>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">No signal</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex space-x-2">
                                {alert.channels.telegram && (
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                                    Telegram
                                  </span>
                                )}
                                {alert.channels.email && (
                                  <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded border border-green-500/30">
                                    Email
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  alert.status === 'DELIVERED'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : alert.status === 'PENDING'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {alert.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {formatDate(alert.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {formatDate(alert.deliveredAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

