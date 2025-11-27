'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  Trophy,
  Copy,
  ExternalLink,
  ArrowLeft,
  BarChart3,
  Coins,
  Clock,
} from 'lucide-react';

interface WalletDetails {
  wallet: {
    id: string;
    address: string;
    label?: string;
    tracked: boolean;
    createdAt: string;
  };
  holdings: Array<{
    token: {
      id: string;
      symbol: string;
      name: string;
      chain: string;
      contractAddress: string;
    };
    balance: string;
    lastUpdatedAt: string;
  }>;
  transactions: Array<{
    id: string;
    txHash: string;
    type: 'BUY' | 'SELL';
    token: {
      id: string;
      symbol: string;
      name: string;
      chain: string;
      contractAddress: string;
    };
    amount: string;
    fromAddress: string;
    toAddress: string;
    timestamp: string;
  }>;
  performance: {
    totalPnL: number;
    totalPnLPercent: number;
    winRate: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    avgWin: number;
    avgLoss: number;
  };
  score: number;
}

export default function WalletTrackerPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as string;
  const [walletData, setWalletData] = useState<WalletDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      loadWalletData();
    }
  }, [address]);

  const loadWalletData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getWalletDetails(address);
      setWalletData(data);
    } catch (err: any) {
      console.error('Failed to load wallet data:', err);
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    // You could add a toast notification here
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    const explorers: Record<string, string> = {
      ethereum: `https://etherscan.io/tx/${txHash}`,
      bsc: `https://bscscan.com/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      arbitrum: `https://arbiscan.io/tx/${txHash}`,
      base: `https://basescan.org/tx/${txHash}`,
    };
    return explorers[chain.toLowerCase()] || `https://etherscan.io/tx/${txHash}`;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !walletData) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                {error || 'Wallet not found'}
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const { wallet, holdings, transactions, performance, score } = walletData;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Wallet Header */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold">
                        {wallet.label || 'Unnamed Wallet'}
                      </h1>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <code className="text-purple-300">{formatAddress(wallet.address)}</code>
                        <button
                          onClick={copyAddress}
                          className="hover:text-white transition"
                          title="Copy address"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {score}/100
                  </div>
                  <div className="text-sm text-gray-400">Wallet Score</div>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-400">Total PnL</span>
                </div>
                <div className={`text-2xl font-bold ${performance.totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {performance.totalPnLPercent >= 0 ? '+' : ''}
                  {performance.totalPnLPercent.toFixed(2)}%
                </div>
              </div>

              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm text-gray-400">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  {performance.winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {performance.winningTrades}W / {performance.losingTrades}L
                </div>
              </div>

              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-gray-400">Total Trades</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {performance.totalTrades}
                </div>
              </div>

              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <span className="text-sm text-gray-400">Avg Win</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  +{performance.avgWin.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg Loss: -{performance.avgLoss.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Current Holdings */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Coins className="w-5 h-5 text-purple-400" />
                    Current Holdings
                  </h2>
                  <span className="text-sm text-gray-400">{holdings.length} tokens</span>
                </div>
                {holdings.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No holdings found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holdings.map((holding) => (
                      <div
                        key={holding.token.id}
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-sm">
                            {holding.token.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium">{holding.token.symbol}</div>
                            <div className="text-xs text-gray-400">{holding.token.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{parseFloat(holding.balance).toFixed(4)}</div>
                          <div className="text-xs text-gray-400">{holding.token.chain}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Transactions */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-400" />
                    Recent Transactions
                  </h2>
                  <span className="text-sm text-gray-400">{transactions.length} txs</span>
                </div>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No transactions found
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              tx.type === 'BUY'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {tx.type === 'BUY' ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {tx.type} {tx.token.symbol}
                            </div>
                            <div className="text-xs text-gray-400">
                              {getTimeAgo(tx.timestamp)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              {parseFloat(tx.amount).toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-400">{tx.token.chain}</div>
                          </div>
                          <a
                            href={getExplorerUrl(tx.token.chain, tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 transition"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

