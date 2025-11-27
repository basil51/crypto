'use client';

import { useEffect, useState, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';
import Link from 'next/link';
import { TrendingUp, Zap, Bell, Wallet, Sparkles, Trophy, ArrowUpRight } from 'lucide-react';

interface HotAccumulation {
  tokenId: string;
  symbol: string;
  chain: string;
  name: string;
  contractAddress: string;
  accumScore: number;
  whaleFlow: string;
  price?: string;
  change?: string;
}

interface WhaleAlert {
  id: string;
  type: string;
  token: {
    symbol: string;
    chain: string;
  };
  message: string;
  timestamp: string;
  amount?: string;
}

interface SmartMoneyWallet {
  address: string;
  name?: string;
  winRate: number;
  totalPnL: number;
  tokensTracked: number;
  recentActivity: string;
}

interface NewBornToken {
  tokenId: string;
  symbol: string;
  chain: string;
  name: string;
  contractAddress: string;
  age: string;
  whaleBuys: number;
  accumScore: number;
}

interface TopGainer {
  tokenId: string;
  symbol: string;
  chain: string;
  name: string;
  contractAddress: string;
  accumScore: number;
  predictedGain: string;
  confidence: number;
}

export default function Dashboard() {
  const [selectedChain, setSelectedChain] = useState<string>('ALL');
  const [hotAccumulations, setHotAccumulations] = useState<HotAccumulation[]>([]);
  const [whaleAlerts, setWhaleAlerts] = useState<WhaleAlert[]>([]);
  const [smartMoneyWallets, setSmartMoneyWallets] = useState<SmartMoneyWallet[]>([]);
  const [newBornTokens, setNewBornTokens] = useState<NewBornToken[]>([]);
  const [topGainers, setTopGainers] = useState<TopGainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const chains = ['ALL', 'ETH', 'SOL', 'BASE', 'BSC', 'ARB', 'MATIC'];

  useEffect(() => {
    // Initial load
    loadDashboardData();

    // Set up WebSocket connection
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) {
      wsClient.connect(token);

      // Subscribe to dashboard updates
      wsClient.subscribe(['dashboard_update', 'notification', 'whale_transaction', 'signal_update']);

      // Handle dashboard updates
      const handleDashboardUpdate = (data: any) => {
        if (data.hotAccumulations) {
          const accumulations: HotAccumulation[] = data.hotAccumulations
            .filter((token: any) => selectedChain === 'ALL' || token.chain === selectedChain)
            .slice(0, 10)
            .map((token: any) => ({
              tokenId: token.tokenId,
              symbol: token.symbol,
              chain: token.chain,
              name: token.name || token.symbol,
              contractAddress: token.contractAddress,
              accumScore: token.accumScore,
              whaleFlow: token.whaleFlow || '+$0',
              price: token.price || '$0.00',
              change: token.change || '+0%',
            }));
          setHotAccumulations(accumulations);
        }
        if (data.whaleAlerts) {
          setWhaleAlerts(data.whaleAlerts);
        }
        if (data.smartMoneyWallets) {
          setSmartMoneyWallets(data.smartMoneyWallets);
        }
        if (data.newBornTokens) {
          setNewBornTokens(data.newBornTokens);
        }
        if (data.topGainers) {
          setTopGainers(data.topGainers);
        }
      };

      // Handle notifications
      const handleNotification = (notification: any) => {
        // Add new notification to whale alerts
        if (notification.token) {
          const newAlert: WhaleAlert = {
            id: notification.id,
            type: notification.alertType || 'WHALE_BUY',
            token: {
              symbol: notification.token.symbol || 'Unknown',
              chain: notification.token.chain || 'ETH',
            },
            message: notification.message || 'Whale activity detected',
            timestamp: notification.createdAt,
            amount: notification.metadata?.amount,
          };
          setWhaleAlerts((prev) => [newAlert, ...prev].slice(0, 10));
        }
      };

      wsClient.on('dashboard_update', handleDashboardUpdate);
      wsClient.on('notification', handleNotification);

      // Fallback: still poll every 60 seconds as backup
      const interval = setInterval(() => {
        loadDashboardData();
      }, 60000);

      return () => {
        wsClient.off('dashboard_update', handleDashboardUpdate);
        wsClient.off('notification', handleNotification);
        clearInterval(interval);
      };
    } else {
      // Fallback to polling if no token
      const interval = setInterval(() => {
        loadDashboardData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [selectedChain]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // Load all sections in parallel
      const [topTokens, alerts, notifications, leaderboard, newBorn, topGainersData] = await Promise.all([
        api.getTopAccumulatingTokens(20),
        api.getAlerts(),
        api.getMyNotifications(10, true),
        api.getSmartMoneyLeaderboard(10),
        api.getNewBornTokens(10),
        api.getTopGainers(10),
      ]);

      // Transform top tokens to hot accumulations
      const accumulations: HotAccumulation[] = topTokens
        .filter((token: any) => selectedChain === 'ALL' || token.chain === selectedChain)
        .slice(0, 10)
        .map((token: any) => ({
          tokenId: token.tokenId,
          symbol: token.symbol,
          chain: token.chain,
          name: token.name || token.symbol,
          contractAddress: token.contractAddress,
          accumScore: token.accumScore,
          whaleFlow: token.whaleFlow || '+$0',
          price: token.price || '$0.00',
          change: token.change || '+0%',
        }));

      setHotAccumulations(accumulations);

      // Transform notifications to whale alerts
      const alertsList: WhaleAlert[] = notifications
        .slice(0, 10)
        .map((notif: any) => ({
          id: notif.id,
          type: notif.alertType || notif.type || 'WHALE_BUY',
          token: {
            symbol: notif.token?.symbol || 'Unknown',
            chain: notif.token?.chain || 'ETH',
          },
          message: notif.message || 'Whale activity detected',
          timestamp: notif.createdAt,
          amount: notif.metadata?.amount,
        }));

      setWhaleAlerts(alertsList);

      // Transform smart money leaderboard
      const wallets: SmartMoneyWallet[] = leaderboard.map((wallet: any) => ({
        address: wallet.address,
        name: wallet.name,
        winRate: wallet.winRate,
        totalPnL: wallet.totalPnL,
        tokensTracked: wallet.tokensTracked,
        recentActivity: wallet.recentActivity,
      }));
      setSmartMoneyWallets(wallets);

      // Transform new born tokens
      const newBornList: NewBornToken[] = newBorn
        .filter((token: any) => selectedChain === 'ALL' || token.chain === selectedChain)
        .map((token: any) => ({
          tokenId: token.tokenId,
          symbol: token.symbol,
          chain: token.chain,
          name: token.name || token.symbol,
          contractAddress: token.contractAddress,
          age: token.age,
          whaleBuys: token.whaleBuys,
          accumScore: token.accumScore,
        }));
      setNewBornTokens(newBornList);

      // Transform top gainers
      const gainers: TopGainer[] = topGainersData
        .filter((token: any) => selectedChain === 'ALL' || token.chain === selectedChain)
        .map((token: any) => ({
          tokenId: token.tokenId,
          symbol: token.symbol,
          chain: token.chain,
          name: token.name || token.symbol,
          contractAddress: token.contractAddress,
          accumScore: token.accumScore,
          predictedGain: token.predictedGain,
          confidence: token.confidence,
        }));
      setTopGainers(gainers);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'WHALE_BUY':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'WHALE_SELL':
        return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
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
                Dashboard
              </h1>
              <p className="text-gray-300 text-lg">
                Real-time smart money tracking across all chains
              </p>
            </div>

            {/* Chain Filter */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {chains.map((chain) => (
                <button
                  key={chain}
                  onClick={() => setSelectedChain(chain)}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                    selectedChain === chain
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {chain}
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Hot Accumulations */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Zap className="w-6 h-6 text-purple-400" />
                  Hot Accumulations
                </h2>
                <div className="flex items-center gap-2 text-green-400">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">LIVE</span>
                </div>
              </div>
              {isLoading && hotAccumulations.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                  ))}
                </div>
              ) : hotAccumulations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No hot accumulations found. Check back soon!
                </div>
              ) : (
                <div className="space-y-3">
                  {hotAccumulations.map((token) => (
                    <Link
                      key={token.tokenId}
                      href={`/token/${token.chain.toLowerCase()}/${token.contractAddress === '0x0000000000000000000000000000000000000000' ? token.symbol.toLowerCase() : (token.contractAddress || token.symbol.toLowerCase())}`}
                      className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold">
                          {token.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            {token.symbol}
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                              {token.chain}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">{token.name}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <div className="text-purple-400 font-semibold">{token.whaleFlow}</div>
                          <div className="text-xs text-gray-400">Whale Flow</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <div className="w-16 bg-gray-700 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                style={{ width: `${token.accumScore}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold">{token.accumScore}</span>
                          </div>
                          <div className="text-xs text-gray-400">Score</div>
                        </div>
                        <ArrowUpRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Whale Alerts Feed */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-purple-400" />
                    Whale Alerts Feed
                  </h2>
                  <Link href="/notifications" className="text-sm text-purple-400 hover:text-purple-300">
                    View All
                  </Link>
                </div>
                {isLoading && whaleAlerts.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                ) : whaleAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No whale alerts. Check back soon!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {whaleAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                      >
                        <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {alert.message}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {alert.token.symbol} • {alert.token.chain} • {getTimeAgo(alert.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Smart Money Wallets Leaderboard */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-400" />
                    Smart Money Leaderboard
                  </h2>
                  <Link href="/whales" className="text-sm text-purple-400 hover:text-purple-300">
                    View All
                  </Link>
                </div>
                {smartMoneyWallets.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Smart money wallet tracking coming soon!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {smartMoneyWallets.map((wallet, index) => (
                      <div
                        key={wallet.address}
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {wallet.name || `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
                            </div>
                            <div className="text-xs text-gray-400">
                              {wallet.winRate}% Win Rate • {wallet.tokensTracked} tokens
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-400">
                            +{wallet.totalPnL}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Two Column Layout - Bottom */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* New Born Tokens */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    New Born Tokens
                  </h2>
                </div>
                {newBornTokens.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    New born token tracking coming soon!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {newBornTokens.map((token) => (
                      <Link
                        key={token.tokenId}
                        href={`/token/${token.chain}/${token.contractAddress || token.symbol}`}
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xs">
                            {token.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white flex items-center gap-2">
                              {token.symbol}
                              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-xs rounded">
                                {token.age}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400">
                              {token.whaleBuys} whale buys
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold">{token.accumScore}</div>
                          <div className="text-xs text-gray-400">Score</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Gainers Prediction */}
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    Top Gainers Prediction
                  </h2>
                </div>
                {topGainers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Top gainers prediction coming soon!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topGainers.map((token) => (
                      <Link
                        key={token.tokenId}
                        href={`/token/${token.chain}/${token.contractAddress || token.symbol}`}
                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold text-xs">
                            {token.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">
                              {token.symbol}
                            </div>
                            <div className="text-xs text-gray-400">
                              {token.confidence}% confidence
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-green-400">
                            {token.predictedGain}
                          </div>
                          <div className="text-xs text-gray-400">Predicted</div>
                        </div>
                      </Link>
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
