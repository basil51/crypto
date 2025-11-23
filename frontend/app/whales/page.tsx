'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

interface TopBuyer {
  address: string;
  totalAmount: number;
  transactionCount: number;
  latestTransaction: string;
}

interface WhaleActivity {
  events: any[];
  topBuyers: TopBuyer[];
  whaleScore: number;
  summary: {
    eventCount: number;
    totalVolume: number;
    uniqueWallets: number;
  };
}

export default function WhalesPage() {
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [tokens, setTokens] = useState<any[]>([]);
  const [whaleActivity, setWhaleActivity] = useState<WhaleActivity | null>(null);
  const [exchangeFlows, setExchangeFlows] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    loadTokens();
  }, []);

  useEffect(() => {
    if (selectedTokenId) {
      loadWhaleActivity();
      loadExchangeFlows();
    }
  }, [selectedTokenId, hours]);

  const loadTokens = async () => {
    try {
      const data = await api.getTokens({ active: true });
      setTokens(data);
      if (data.length > 0 && !selectedTokenId) {
        setSelectedTokenId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  };

  const loadWhaleActivity = async () => {
    if (!selectedTokenId) return;
    setLoading(true);
    try {
      const data = await api.getTokenWhaleActivity(selectedTokenId, hours);
      setWhaleActivity(data);
    } catch (error) {
      console.error('Error loading whale activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExchangeFlows = async () => {
    if (!selectedTokenId) return;
    try {
      const data = await api.getExchangeFlows(selectedTokenId, undefined, hours);
      setExchangeFlows(data);
    } catch (error) {
      console.error('Error loading exchange flows:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Whale Activity</h1>
              <p className="text-gray-600 text-lg">
                Track whale movements and large transactions
              </p>
            </div>

            {/* Filters */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Token
                  </label>
                  <select
                    value={selectedTokenId}
                    onChange={(e) => setSelectedTokenId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="">Select a token...</option>
                    {tokens.map((token) => (
                      <option key={token.id} value={token.id}>
                        {token.symbol} ({token.chain})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Time Range
                  </label>
                  <select
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value={1}>Last 1 hour</option>
                    <option value={6}>Last 6 hours</option>
                    <option value={24}>Last 24 hours</option>
                    <option value={168}>Last 7 days</option>
                  </select>
                </div>
              </div>
            </div>

            {loading && (
              <div className="glass shadow-soft rounded-xl p-8">
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              </div>
            )}

            {whaleActivity && !loading && (
              <>
                {/* Whale Score Card */}
                <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <h2 className="text-xl font-semibold mb-4">Whale Score</h2>
              <div className="flex items-center">
                <div className="text-4xl font-bold text-blue-600">
                  {whaleActivity.whaleScore}
                </div>
                <div className="ml-4">
                  <div className="text-sm text-gray-600">
                    {whaleActivity.summary.eventCount} events
                  </div>
                  <div className="text-sm text-gray-600">
                    {whaleActivity.summary.uniqueWallets} unique wallets
                  </div>
                </div>
              </div>
            </div>

                {/* Top Buyers */}
                <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <h2 className="text-xl font-semibold mb-4">Top Buyers</h2>
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
                    {whaleActivity.topBuyers.map((buyer, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {buyer.address.slice(0, 10)}...{buyer.address.slice(-8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {buyer.totalAmount.toLocaleString()}
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

                {/* Exchange Flows */}
                {exchangeFlows && (
                  <div className="glass shadow-soft rounded-xl p-6 card-hover">
                <h2 className="text-xl font-semibold mb-4">Exchange Flows</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Inflow</div>
                    <div className="text-2xl font-bold text-green-600">
                      {exchangeFlows.summary.inflow.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-red-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Outflow</div>
                    <div className="text-2xl font-bold text-red-600">
                      {exchangeFlows.summary.outflow.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Net Flow</div>
                    <div className={`text-2xl font-bold ${
                      exchangeFlows.summary.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {exchangeFlows.summary.netFlow.toLocaleString()}
                    </div>
                  </div>
                </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

