'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';

interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: string;
}

interface Alert {
  id: string;
  signal?: {
    token?: Token;
  };
  token?: Token;
  channels: {
    telegram?: boolean;
    email?: boolean;
  };
  status: string;
  createdAt?: string | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [channels, setChannels] = useState({ telegram: false, email: false });

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
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Alert Settings</h1>
              <p className="text-gray-600 text-lg">
                Manage your token alert subscriptions
              </p>
            </div>

            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-soft">
                {error}
              </div>
            )}

            {/* Subscribe Form */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Subscribe to Alerts</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token
                  </label>
                  <select
                    value={selectedToken}
                    onChange={(e) => setSelectedToken(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <p className="mt-1 text-xs text-gray-500">
                      💡 Run <code className="bg-gray-100 px-1 rounded">pnpm db:seed</code> in the backend directory to seed tokens
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Telegram</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={channels.email}
                        onChange={(e) =>
                          setChannels({ ...channels, email: e.target.checked })
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Email</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSubscribe}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                >
                  Subscribe
                </button>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="glass shadow-soft rounded-xl p-6 card-hover">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Active Subscriptions</h2>
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : alerts.length === 0 ? (
                <p className="text-gray-500">You have no active subscriptions.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Token
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Channels
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Subscribed
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {alerts.map((alert) => (
                        <tr key={alert.id} className="transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {alert.signal?.token?.symbol || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{alert.signal?.token?.name || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-2">
                              {alert.channels.telegram && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                  Telegram
                                </span>
                              )}
                              {alert.channels.email && (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                  Email
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                alert.status === 'ACTIVE'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(alert.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleUnsubscribe(alert.signal?.token?.id || '')}
                              className="text-red-600 hover:text-red-800 font-semibold hover:underline transition-colors"
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
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

