'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

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
  const [sellWalls, setSellWalls] = useState<SellWall[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState<string>('all');

  useEffect(() => {
    // Note: This endpoint needs to be created in the backend
    // For now, this is a placeholder
    loadSellWalls();
  }, [selectedExchange]);

  const loadSellWalls = async () => {
    setLoading(true);
    try {
      const data = await api.getSellWalls({
        exchange: selectedExchange !== 'all' ? selectedExchange : undefined,
        activeOnly: true,
      });
      setSellWalls(data);
    } catch (error) {
      console.error('Error loading sell walls:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Sell Walls & Orderbook Pressure</h1>
              <p className="text-gray-600 text-lg">
                Monitor large sell orders and orderbook pressure on exchanges
              </p>
            </div>

            {/* Exchange Filter */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange
                </label>
                <select
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                >
                  <option value="all">All Exchanges</option>
                  <option value="binance">Binance</option>
                  <option value="kucoin">KuCoin</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="glass shadow-soft rounded-xl p-8">
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              </div>
            )}

            {!loading && sellWalls.length === 0 && (
              <div className="glass shadow-soft rounded-xl p-8 text-center">
                <p className="text-gray-600">
                  No sell walls detected yet. The sell wall detector runs every 5 minutes.
                </p>
              </div>
            )}

            {!loading && sellWalls.length > 0 && (
              <div className="glass shadow-soft rounded-xl overflow-hidden card-hover">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Exchange
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Token
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Detected At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sellWalls.map((wall) => (
                    <tr key={wall.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {wall.exchange}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {wall.tokenName ? (
                          <div>
                            <div className="font-semibold text-gray-900">
                              {wall.tokenName}
                            </div>
                            <div className="text-xs text-gray-500 font-mono">
                              {wall.tokenSymbol || wall.symbol}
                            </div>
                          </div>
                        ) : (
                          <span className="font-mono">{wall.symbol}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ${wall.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {wall.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        ${wall.totalValue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          wall.removedAt
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {wall.removedAt ? 'Removed' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

