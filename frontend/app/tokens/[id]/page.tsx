'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  contractAddress: string;
  decimals: number;
  active: boolean;
  metadata: any;
  createdAt: string;
}

interface Signal {
  id: string;
  score: number | string;
  signalType: string;
  createdAt: string;
  metadata: any;
  buyAmount?: string;
  buyAmountFormatted?: string;
  transactionCount?: number;
  isBuy?: boolean;
  token: {
    id: string;
    symbol: string;
    name: string;
    chain: string;
    contractAddress: string;
  };
}

// Helper function to convert score to number (handles Prisma Decimal)
const getScoreNumber = (score: number | string): number => {
  if (typeof score === 'number') return score;
  return parseFloat(score.toString());
};

export default function TokenDetailPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const [token, setToken] = useState<Token | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokenId) {
      loadTokenData();
    }
  }, [tokenId]);

  const loadTokenData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [tokenData, signalsData] = await Promise.all([
        api.getToken(tokenId),
        api.getSignals({ tokenId, limit: 20 }),
      ]);
      setToken(tokenData);
      setSignals(signalsData);
    } catch (err: any) {
      setError(err.message || 'Failed to load token data');
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

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="animate-pulse">
                <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/4 mb-4"></div>
                <div className="h-64 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !token) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-soft">
                {error || 'Token not found'}
              </div>
              <Link href="/tokens" className="mt-4 inline-block text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                ← Back to Tokens
              </Link>
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
            <Link
              href="/tokens"
              className="text-purple-600 hover:text-purple-800 mb-4 inline-block font-semibold transition-colors"
            >
              ← Back to Tokens
            </Link>

            {/* Token Info */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold gradient-text">{token.symbol}</h1>
                  <p className="text-gray-600 mt-1 text-lg">{token.name}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    token.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {token.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Chain</dt>
                  <dd className="mt-1 text-sm text-gray-900">{token.chain}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Decimals</dt>
                  <dd className="mt-1 text-sm text-gray-900">{token.decimals}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Contract Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {token.contractAddress}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Added</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(token.createdAt)}
                  </dd>
                </div>
              </div>
            </div>

            {/* Signals */}
            <div className="glass shadow-soft rounded-xl p-6 card-hover">
              <h2 className="text-2xl font-bold gradient-text mb-4">Recent Signals</h2>
              {signals.length === 0 ? (
                <p className="text-gray-500 text-lg">No signals detected for this token yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                      <tr>
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
                                <div className="font-semibold">
                                  {signal.buyAmountFormatted} {signal.token.symbol}
                                </div>
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
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

