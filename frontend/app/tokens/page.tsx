'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';

// Helper function to convert score to number (handles Prisma Decimal)
const getScoreNumber = (score: number | string): number => {
  if (typeof score === 'number') return score;
  return parseFloat(score.toString());
};

interface Token {
  id: string;
  symbol: string;
  name: string;
  chain: string;
  contractAddress: string;
  decimals: number;
  active: boolean;
  metadata: any;
  signalCount?: number;
  latestSignal?: {
    id: string;
    score: number | string;
    signalType: string;
    createdAt: string;
  } | null;
}

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ chain: '', active: '' });

  useEffect(() => {
    loadTokens();
  }, [filter]);

  const loadTokens = async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: any = {};
      if (filter.chain) params.chain = filter.chain;
      if (filter.active !== '') params.active = filter.active === 'true';
      params.withSignals = true; // Include signal statistics

      const data = await api.getTokens(params);
      setTokens(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load tokens');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Tokens</h1>
              <p className="text-gray-300 text-lg">
                All tracked tokens. Tokens with signals appear on the dashboard.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Note: Native tokens (ETH, BNB, MATIC) use the zero address and cannot be tracked via ERC20 transfers.
              </p>
            </div>

            {/* Filters */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Chain
                  </label>
                  <select
                    value={filter.chain}
                    onChange={(e) => setFilter({ ...filter, chain: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="">All Chains</option>
                    <option value="ethereum">Ethereum</option>
                    <option value="bsc">BSC</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filter.active}
                    onChange={(e) => setFilter({ ...filter, active: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  >
                    <option value="">All</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {isLoading ? (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-8">
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-purple-500/10 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ) : tokens.length === 0 ? (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-8 text-center">
                <p className="text-gray-400 text-lg">No tokens found.</p>
              </div>
            ) : (
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-500/20">
                    <thead className="bg-purple-500/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Token
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Chain
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Contract Address
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Signals
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Latest Signal
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {tokens.map((token) => (
                        <tr key={token.id} className="transition-colors hover:bg-purple-500/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {token.symbol}
                            </div>
                            <div className="text-sm text-gray-400">{token.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {token.chain}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {token.contractAddress === '0x0000000000000000000000000000000000000000' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-400 italic">Native Token</span>
                                <span
                                  className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded border border-blue-500/30"
                                  title="Native tokens (ETH, BNB, MATIC) use the zero address. They cannot be tracked via ERC20 transfers."
                                >
                                  ℹ️
                                </span>
                              </div>
                            ) : (
                              <div className="text-sm text-white font-mono">
                                {token.contractAddress.slice(0, 10)}...
                                {token.contractAddress.slice(-8)}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {token.signalCount !== undefined ? (
                              <div className="flex items-center">
                                <span className="font-medium text-white">{token.signalCount}</span>
                                {token.signalCount > 0 && (
                                  <span className="ml-2 text-xs text-purple-400">signals</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {token.latestSignal ? (
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      getScoreNumber(token.latestSignal.score) >= 75
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : getScoreNumber(token.latestSignal.score) >= 60
                                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        : 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    }`}
                                  >
                                    {getScoreNumber(token.latestSignal.score).toFixed(1)}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(token.latestSignal.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {token.latestSignal.signalType}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 text-sm">No signals yet</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                token.active
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}
                            >
                              {token.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Link
                              href={`/token/${token.chain.toLowerCase()}/${token.contractAddress === '0x0000000000000000000000000000000000000000' ? token.symbol.toLowerCase() : token.contractAddress}`}
                              className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition-colors"
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

