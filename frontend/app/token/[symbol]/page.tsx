'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function TokenIntelligencePage() {
  const params = useParams();
  const symbol = params.symbol as string;
  const [token, setToken] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [whaleActivity, setWhaleActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (symbol) {
      loadTokenData();
    }
  }, [symbol]);

  const loadTokenData = async () => {
    setLoading(true);
    try {
      // Find token by symbol
      const tokens = await api.getTokens({ active: true });
      const foundToken = tokens.find(
        (t: any) => t.symbol.toLowerCase() === symbol.toLowerCase()
      );

      if (foundToken) {
        setToken(foundToken);
        
        // Load related data
        const [signalsData, whaleData] = await Promise.all([
          api.getSignals({ tokenId: foundToken.id, limit: 10 }),
          api.getTokenWhaleActivity(foundToken.id, 24),
        ]);
        
        setSignals(signalsData);
        setWhaleActivity(whaleData);
      }
    } catch (error) {
      console.error('Error loading token data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (!token) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="glass shadow-soft rounded-xl p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
                <p className="text-gray-600 mb-4">Token with symbol "{symbol}" not found.</p>
                <Link href="/tokens" className="text-purple-600 hover:underline">
                  Back to Tokens
                </Link>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Breadcrumb */}
            <nav className="mb-6">
              <Link href="/tokens" className="text-purple-600 hover:underline">
                Tokens
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-600">{token.symbol}</span>
            </nav>

            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">{token.name}</h1>
              <p className="text-gray-600 text-lg">{token.symbol} • {token.chain}</p>
            </div>

            {/* Token Header */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{token.name}</h1>
              <p className="text-gray-600 mt-1">{token.symbol} • {token.chain}</p>
              <p className="text-sm text-gray-500 mt-2 font-mono">
                {token.contractAddress}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Status</div>
              <span className={`px-3 py-1 rounded text-sm ${
                token.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {token.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {whaleActivity && (
                <>
                  <div className="glass shadow-soft rounded-xl p-6 card-hover">
                    <div className="text-sm text-gray-600 mb-2">Whale Score</div>
                    <div className="text-3xl font-bold text-purple-600">
                      {whaleActivity.whaleScore}
                    </div>
                  </div>
                  <div className="glass shadow-soft rounded-xl p-6 card-hover">
                    <div className="text-sm text-gray-600 mb-2">Whale Events</div>
                    <div className="text-3xl font-bold">
                      {whaleActivity.summary.eventCount}
                    </div>
                  </div>
                  <div className="glass shadow-soft rounded-xl p-6 card-hover">
                    <div className="text-sm text-gray-600 mb-2">Unique Wallets</div>
                    <div className="text-3xl font-bold">
                      {whaleActivity.summary.uniqueWallets}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Recent Signals */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
          <h2 className="text-xl font-semibold mb-4">Recent Signals</h2>
          {signals.length === 0 ? (
            <p className="text-gray-600">No signals detected yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {signals.map((signal) => (
                    <tr key={signal.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-sm font-semibold ${
                          Number(signal.score) >= 75
                            ? 'bg-red-100 text-red-800'
                            : Number(signal.score) >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {Number(signal.score).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {signal.signalType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(signal.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          href={`/signals/${signal.id}`}
                          className="text-blue-600 hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

            {/* Top Buyers */}
            {whaleActivity && whaleActivity.topBuyers && whaleActivity.topBuyers.length > 0 && (
              <div className="glass shadow-soft rounded-xl p-6 card-hover">
            <h2 className="text-xl font-semibold mb-4">Top Buyers (24h)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {whaleActivity.topBuyers.slice(0, 5).map((buyer: any, idx: number) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                        {buyer.address?.slice(0, 10)}...{buyer.address?.slice(-8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {buyer.totalAmount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {buyer.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

