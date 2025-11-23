'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Signal {
  id: string;
  score: number | string;
  signalType: string;
  windowStart: string;
  windowEnd: string;
  walletsInvolved: any;
  metadata: any;
  createdAt: string;
  token: {
    id: string;
    symbol: string;
    name: string;
    chain: string;
    contractAddress: string;
  };
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

export default function SignalDetailPage() {
  const params = useParams();
  const signalId = params.id as string;
  const [signal, setSignal] = useState<Signal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (signalId) {
      loadSignal();
    }
  }, [signalId]);

  const loadSignal = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getSignal(signalId);
      setSignal(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load signal');
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number | string) => {
    const scoreNum = getScoreNumber(score);
    if (scoreNum >= 75) return 'text-red-600 bg-red-50 border-red-200';
    if (scoreNum >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
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

  if (error || !signal) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-soft">
                {error || 'Signal not found'}
              </div>
              <Link href="/" className="mt-4 inline-block text-purple-600 hover:text-purple-800 font-semibold transition-colors">
                ← Back to Dashboard
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
            <Link href="/" className="text-purple-600 hover:text-purple-800 mb-4 inline-block font-semibold transition-colors">
              ← Back to Dashboard
            </Link>

            {/* Signal Header */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold gradient-text">Accumulation Signal</h1>
                  <p className="text-gray-600 mt-1 text-lg">
                    {signal.token.symbol} ({signal.token.name})
                  </p>
                </div>
                <div
                  className={`px-4 py-2 rounded-lg border-2 ${getScoreColor(signal.score)}`}
                >
                  <div className="text-2xl font-bold">{getScoreNumber(signal.score).toFixed(1)}</div>
                  <div className="text-xs">Score</div>
                </div>
              </div>
            </div>

            {/* Signal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="glass shadow-soft rounded-xl p-6 card-hover">
                <h2 className="text-xl font-bold gradient-text mb-4">Signal Information</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Signal Type</dt>
                    <dd className="mt-1">
                      <div className="text-sm font-semibold text-gray-900">{getSignalTypeLabel(signal.signalType)}</div>
                      <div className="text-xs text-gray-500">{signal.signalType}</div>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Buy/Sell</dt>
                    <dd className="mt-1">
                      {signal.isBuy !== undefined ? (
                        <span
                          className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                            signal.isBuy
                              ? 'text-green-700 bg-green-100'
                              : 'text-red-700 bg-red-100'
                          }`}
                        >
                          {signal.isBuy ? '🟢 BUY Signal' : '🔴 SELL Signal'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Buy Amount</dt>
                    <dd className="mt-1">
                      {signal.buyAmountFormatted ? (
                        <div>
                          <div className="text-lg font-bold text-gray-900">
                            {signal.buyAmountFormatted} {signal.token.symbol}
                          </div>
                          {signal.transactionCount !== undefined && (
                            <div className="text-sm text-gray-500 mt-1">
                              Across {signal.transactionCount} {signal.transactionCount === 1 ? 'transaction' : 'transactions'}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Calculating...</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Window Start</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(signal.windowStart)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Window End</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(signal.windowEnd)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Detected At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(signal.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="glass shadow-soft rounded-xl p-6 card-hover">
                <h2 className="text-xl font-bold gradient-text mb-4">Token Information</h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Chain</dt>
                    <dd className="mt-1 text-sm text-gray-900">{signal.token.chain}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Contract Address</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {signal.token.contractAddress}
                    </dd>
                  </div>
                  <div>
                    <Link
                      href={`/tokens/${signal.token.id}`}
                      className="text-purple-600 hover:text-purple-800 text-sm font-semibold hover:underline transition-colors"
                    >
                      View Token Details →
                    </Link>
                  </div>
                </dl>
              </div>
            </div>

            {/* Wallets Involved */}
            {signal.walletsInvolved && Array.isArray(signal.walletsInvolved) && signal.walletsInvolved.length > 0 && (
              <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
                <h2 className="text-xl font-bold gradient-text mb-4">
                  Wallets Involved ({signal.walletsInvolved.length})
                </h2>
                <div className="space-y-2">
                  {signal.walletsInvolved.map((wallet: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded border border-gray-200 font-mono text-sm"
                    >
                      {typeof wallet === 'string' ? wallet : wallet.address || JSON.stringify(wallet)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {signal.metadata && Object.keys(signal.metadata).length > 0 && (
              <div className="glass shadow-soft rounded-xl p-6 card-hover">
                <h2 className="text-xl font-bold gradient-text mb-4">Additional Metadata</h2>
                <pre className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto text-xs">
                  {JSON.stringify(signal.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

