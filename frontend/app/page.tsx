'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Signal {
  id: string;
  score: number | string;
  signalType: string;
  createdAt: string;
  token: {
    id: string;
    symbol: string;
    name: string;
    chain: string;
    contractAddress: string;
  };
  metadata: any;
  buyAmount?: string;
  buyAmountFormatted?: string;
  transactionCount?: number;
  isBuy?: boolean;
}

// Helper function to convert score to number (handles Prisma Decimal)
const getScoreNumber = (score: number | string): number => {
  if (typeof score === 'number') return score;
  return parseFloat(score.toString());
};

export default function Dashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    minScore: '',
    chain: '',
    recentHours: '24',
  });

  useEffect(() => {
    loadSignals();
  }, [filters]);

  const loadSignals = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filters.minScore) params.minScore = parseFloat(filters.minScore);
      if (filters.chain) params.chain = filters.chain;
      if (filters.recentHours) params.recentHours = parseInt(filters.recentHours);
      params.limit = 50;

      const data = await api.getSignals(params);
      setSignals(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load signals');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number | string) => {
    const scoreNum = getScoreNumber(score);
    if (scoreNum >= 75) return 'text-red-600 bg-red-50';
    if (scoreNum >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSignalTypeLabel = (signalType: string) => {
    const labels: Record<string, string> = {
      WHALE_INFLOW: 'Whale Buying',
      EXCHANGE_OUTFLOW: 'Exchange Withdrawal (Buying)',
      LP_INCREASE: 'Liquidity Pool Increase',
      CONCENTRATED_BUYS: 'Concentrated Buying',
      HOLDING_PATTERNS: 'Accumulation Pattern',
    };
    return labels[signalType] || signalType;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Dashboard</h1>
              <p className="text-gray-600 text-lg">
                Recent accumulation signals and whale activity
              </p>
            </div>

            {/* Filters */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Score
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minScore}
                    onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    placeholder="e.g. 60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chain
                  </label>
                  <select
                    value={filters.chain}
                    onChange={(e) => setFilters({ ...filters, chain: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="">All Chains</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recent Hours
                  </label>
                  <select
                    value={filters.recentHours}
                    onChange={(e) => setFilters({ ...filters, recentHours: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="1">Last Hour</option>
                    <option value="6">Last 6 Hours</option>
                    <option value="24">Last 24 Hours</option>
                    <option value="168">Last Week</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Signals List */}
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 shadow-soft">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="glass shadow-soft rounded-xl p-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : signals.length === 0 ? (
              <div className="glass shadow-soft rounded-xl p-8 text-center">
                <p className="text-gray-500 text-lg">No signals found. Try adjusting your filters.</p>
              </div>
            ) : (
              <div className="glass shadow-soft rounded-xl overflow-hidden card-hover">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Token
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Buy/Sell
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Buy Amount
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Chain
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Detected
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {signals.map((signal) => (
                        <tr key={signal.id} className="transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {signal.token.symbol}
                                </div>
                                <div className="text-sm text-gray-500">{signal.token.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getScoreColor(
                                signal.score
                              )}`}
                            >
                              {getScoreNumber(signal.score).toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="font-medium">{getSignalTypeLabel(signal.signalType)}</div>
                            <div className="text-xs text-gray-400">{signal.signalType}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {signal.isBuy !== undefined ? (
                              <span
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  signal.isBuy
                                    ? 'text-green-700 bg-green-100'
                                    : 'text-red-700 bg-red-100'
                                }`}
                              >
                                {signal.isBuy ? '🟢 BUY' : '🔴 SELL'}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            {signal.buyAmountFormatted ? (
                              <div>
                                <div className="font-semibold">{signal.buyAmountFormatted} {signal.token.symbol}</div>
                                {signal.transactionCount !== undefined && (
                                  <div className="text-xs text-gray-500">
                                    {signal.transactionCount} {signal.transactionCount === 1 ? 'tx' : 'txs'}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Calculating...</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {signal.token.chain}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(signal.createdAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/signals/${signal.id}`}
                              className="text-purple-600 hover:text-purple-800 font-semibold hover:underline transition-colors"
                            >
                              View Details
                            </Link>
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
