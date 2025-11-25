'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import SubscriptionRequired from '@/components/SubscriptionRequired';
import { useAuth } from '@/contexts/AuthContext';

interface SellWall {
  id: string;
  exchange: string;
  symbol: string; // Exchange symbol (e.g., BTCUSDT)
  price: number;
  quantity: number;
  totalValue: number;
  wallType: string;
  detectedAt: string;
  removedAt?: string;
  tokenSymbol?: string; // Token symbol (e.g., BTC)
  tokenName?: string; // Token name (e.g., Bitcoin)
  tokenId?: string;
}

export default function SellWallsPage() {
  const { isPro } = useAuth();
  const [sellWalls, setSellWalls] = useState<SellWall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');

  useEffect(() => {
    // Note: This endpoint needs to be created in the backend
    // For now, this is a placeholder
    loadSellWalls();
  }, [selectedExchange]);

  const loadSellWalls = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSellWalls({
        exchange: selectedExchange !== 'all' ? selectedExchange : undefined,
        activeOnly: true,
      });
      setSellWalls(data);
    } catch (error: any) {
      console.error('Error loading sell walls:', error);
      if (error.statusCode === 403) {
        setError('This feature requires a Pro subscription');
      } else {
        setError(error.message || 'Failed to load sell walls');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Sell Walls & Orderbook Pressure</h1>
              <p className="text-gray-300 text-lg">
                Monitor large sell orders and orderbook pressure on exchanges
              </p>
            </div>

            {/* Exchange Filter */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Exchange
                </label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="all">All Exchanges</option>
                  <option value="binance">Binance</option>
                  <option value="kucoin">KuCoin</option>
                </select>
              </div>
            </div>

            {!isPro && (
              <SubscriptionRequired feature="Sell Wall detection" />
            )}

            {isPro && error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isPro && loading && (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-8">
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
                </div>
              </div>
            )}

            {isPro && !loading && sellWalls.length === 0 && (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-8 text-center">
                <p className="text-gray-400">
                  No sell walls detected yet. The sell wall detector runs every 5 minutes.
                </p>
              </div>
            )}

            {isPro && !loading && sellWalls.length > 0 && (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-purple-500/20">
                <thead className="bg-purple-500/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">
                      Detected At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {sellWalls.map((wall) => (
                    <tr key={wall.id} className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {wall.exchange}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {wall.tokenName ? (
                          <div>
                            <div className="font-semibold text-white">
                              {wall.tokenName}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              {wall.tokenSymbol || wall.symbol}
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono text-white">{wall.symbol}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        ${wall.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {wall.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                        ${wall.totalValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          wall.removedAt
                            ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {wall.removedAt ? 'Removed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(wall.detectedAt).toLocaleString()}
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

