'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  Search,
  Filter,
  TrendingUp,
  Star,
  Bell,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface TokenResult {
  tokenId: string;
  symbol: string;
  name: string;
  chain: string;
  contractAddress: string;
  age: number;
  ageFormatted: string;
  volume24h: number;
  marketCap: number;
  whaleInflowPercent: number;
  accumulationScore: number;
  smartWalletsCount: number;
  price: number;
  latestSignal: {
    score: number;
    signalType: string;
    createdAt: string;
  } | null;
}

type SortField = 'accumulationScore' | 'whaleInflowPercent' | 'volume24h' | 'marketCap' | 'age' | 'smartWalletsCount';
type SortOrder = 'asc' | 'desc';

export default function AlphaScreenerPage() {
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('accumulationScore');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filters
  const [filters, setFilters] = useState({
    chain: '',
    minAge: '',
    maxAge: '',
    minVolume24h: '',
    maxVolume24h: '',
    minMarketCap: '',
    maxMarketCap: '',
    minWhaleInflowPercent: '',
    minAccumulationScore: '',
    minSmartWallets: '',
    preset: '',
  });

  const chains = ['ALL', 'ETH', 'SOL', 'BASE', 'BSC', 'ARB', 'MATIC'];

  const presets = [
    {
      id: 'low-mcap-high-smart',
      name: 'Low MC + High Smart Wallets',
      description: '< $1M MC + > 5 smart wallets bought',
      icon: '💎',
    },
    {
      id: 'new-solana-whale',
      name: 'New Solana Gems',
      description: 'Solana tokens < 10 min old with whale buy',
      icon: '🆕',
    },
    {
      id: 'eth-winning-wallets',
      name: 'ETH Winning Wallets',
      description: 'ETH tokens with > 10 winning wallets accumulating',
      icon: '🏆',
    },
  ];

  useEffect(() => {
    loadResults();
  }, [filters, sortBy, sortOrder]);

  const loadResults = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filterParams: any = {
        sortBy,
        sortOrder,
        limit: 100,
      };

      if (filters.chain && filters.chain !== 'ALL') {
        filterParams.chain = filters.chain.toLowerCase();
      }
      if (filters.minAge) filterParams.minAge = parseInt(filters.minAge);
      if (filters.maxAge) filterParams.maxAge = parseInt(filters.maxAge);
      if (filters.minVolume24h) filterParams.minVolume24h = parseFloat(filters.minVolume24h);
      if (filters.maxVolume24h) filterParams.maxVolume24h = parseFloat(filters.maxVolume24h);
      if (filters.minMarketCap) filterParams.minMarketCap = parseFloat(filters.minMarketCap);
      if (filters.maxMarketCap) filterParams.maxMarketCap = parseFloat(filters.maxMarketCap);
      if (filters.minWhaleInflowPercent)
        filterParams.minWhaleInflowPercent = parseFloat(filters.minWhaleInflowPercent);
      if (filters.minAccumulationScore)
        filterParams.minAccumulationScore = parseFloat(filters.minAccumulationScore);
      if (filters.minSmartWallets) filterParams.minSmartWallets = parseInt(filters.minSmartWallets);
      if (filters.preset) filterParams.preset = filters.preset;

      const data = await api.alphaScreener(filterParams);
      setResults(data);
    } catch (err: any) {
      console.error('Failed to load screener results:', err);
      setError(err.message || 'Failed to load results');
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = (presetId: string) => {
    setFilters((prev) => ({ ...prev, preset: presetId }));
  };

  const clearFilters = () => {
    setFilters({
      chain: '',
      minAge: '',
      maxAge: '',
      minVolume24h: '',
      maxVolume24h: '',
      minMarketCap: '',
      maxMarketCap: '',
      minWhaleInflowPercent: '',
      minAccumulationScore: '',
      minSmartWallets: '',
      preset: '',
    });
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-purple-400" />
    ) : (
      <ArrowDown className="w-4 h-4 text-purple-400" />
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Alpha Screener
              </h1>
              <p className="text-gray-300 text-lg">
                Find the next 100x tokens with advanced filters and smart money tracking
              </p>
            </div>

            {/* Presets */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-400" />
                Quick Presets
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id)}
                    className={`p-4 rounded-xl border transition ${
                      filters.preset === preset.id
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/50'
                        : 'bg-black/40 border-purple-500/20 hover:border-purple-500/40'
                    }`}
                  >
                    <div className="text-2xl mb-2">{preset.icon}</div>
                    <div className="font-bold text-white mb-1">{preset.name}</div>
                    <div className="text-sm text-gray-400">{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Filters */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Search className="w-5 h-5 text-purple-400" />
                  Advanced Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Chain */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Chain</label>
                  <select
                    value={filters.chain}
                    onChange={(e) => setFilters({ ...filters, chain: e.target.value })}
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Chains</option>
                    {chains
                      .filter((c) => c !== 'ALL')
                      .map((chain) => (
                        <option key={chain} value={chain}>
                          {chain}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Age (minutes)
                  </label>
                  <input
                    type="number"
                    value={filters.maxAge}
                    onChange={(e) => setFilters({ ...filters, maxAge: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Market Cap Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Max Market Cap (USD)
                  </label>
                  <input
                    type="number"
                    value={filters.maxMarketCap}
                    onChange={(e) => setFilters({ ...filters, maxMarketCap: e.target.value })}
                    placeholder="e.g. 1000000"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Min Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Volume 24h (USD)
                  </label>
                  <input
                    type="number"
                    value={filters.minVolume24h}
                    onChange={(e) => setFilters({ ...filters, minVolume24h: e.target.value })}
                    placeholder="e.g. 10000"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Min Whale Inflow % */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Whale Inflow %
                  </label>
                  <input
                    type="number"
                    value={filters.minWhaleInflowPercent}
                    onChange={(e) =>
                      setFilters({ ...filters, minWhaleInflowPercent: e.target.value })
                    }
                    placeholder="e.g. 5"
                    step="0.1"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Min Accumulation Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Accumulation Score
                  </label>
                  <input
                    type="number"
                    value={filters.minAccumulationScore}
                    onChange={(e) =>
                      setFilters({ ...filters, minAccumulationScore: e.target.value })
                    }
                    placeholder="e.g. 70"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Min Smart Wallets */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Min Smart Wallets
                  </label>
                  <input
                    type="number"
                    value={filters.minSmartWallets}
                    onChange={(e) => setFilters({ ...filters, minSmartWallets: e.target.value })}
                    placeholder="e.g. 5"
                    className="w-full px-4 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Results */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl overflow-hidden">
              <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
                <div className="text-sm text-gray-400">
                  {isLoading ? 'Loading...' : `${results.length} tokens found`}
                </div>
                <div className="text-sm text-gray-400">
                  Sorted by: <span className="text-purple-400 font-semibold">{sortBy}</span> (
                  {sortOrder})
                </div>
              </div>

              {isLoading ? (
                <div className="p-8">
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-purple-500/10 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <p>No tokens found matching your filters.</p>
                  <p className="text-sm mt-2">Try adjusting your filters or clearing them.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-purple-500/20">
                    <thead className="bg-purple-500/10">
                      <tr>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('accumulationScore')}
                        >
                          <div className="flex items-center gap-2">
                            Token
                            <SortIcon field="accumulationScore" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('accumulationScore')}
                        >
                          <div className="flex items-center gap-2">
                            Score
                            <SortIcon field="accumulationScore" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('whaleInflowPercent')}
                        >
                          <div className="flex items-center gap-2">
                            Whale Inflow
                            <SortIcon field="whaleInflowPercent" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('smartWalletsCount')}
                        >
                          <div className="flex items-center gap-2">
                            Smart Wallets
                            <SortIcon field="smartWalletsCount" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('marketCap')}
                        >
                          <div className="flex items-center gap-2">
                            Market Cap
                            <SortIcon field="marketCap" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('volume24h')}
                        >
                          <div className="flex items-center gap-2">
                            Volume 24h
                            <SortIcon field="volume24h" />
                          </div>
                        </th>
                        <th
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-purple-500/20 transition"
                          onClick={() => handleSort('age')}
                        >
                          <div className="flex items-center gap-2">
                            Age
                            <SortIcon field="age" />
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-500/20">
                      {results.map((token) => (
                        <tr
                          key={token.tokenId}
                          className="transition-colors hover:bg-purple-500/5"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold">
                                {token.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white">{token.symbol}</div>
                                <div className="text-xs text-gray-400">{token.name}</div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {token.chain.toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                  style={{ width: `${token.accumulationScore}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-bold text-white">
                                {token.accumulationScore.toFixed(0)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-semibold text-green-400">
                              {formatPercent(token.whaleInflowPercent)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {token.smartWalletsCount}
                              </span>
                              <span className="text-xs text-gray-400">wallets</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-300">
                              {token.marketCap > 0 ? formatCurrency(token.marketCap) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-300">
                              {token.volume24h > 0 ? formatCurrency(token.volume24h) : '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-300">{token.ageFormatted}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/token/${token.chain.toLowerCase()}/${token.contractAddress === '0x0000000000000000000000000000000000000000' ? token.symbol.toLowerCase() : token.contractAddress}`}
                                className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition text-purple-400"
                                title="View Details"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition text-yellow-400"
                                title="Add to Watchlist"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 bg-pink-500/20 hover:bg-pink-500/30 rounded-lg transition text-pink-400"
                                title="Set Alert"
                              >
                                <Bell className="w-4 h-4" />
                              </button>
                            </div>
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

