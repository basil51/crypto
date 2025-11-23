'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import Link from 'next/link';
import { TrendingUp, ArrowLeft, Star, Bell, Share2, ExternalLink, Users, Wallet, BarChart3, Activity, CheckCircle, Flame, Target } from 'lucide-react';

export default function TokenDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chain = params.chain as string;
  const address = params.address as string;
  
  const [activeTab, setActiveTab] = useState('transactions');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState('24h');
  const [token, setToken] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [whaleActivity, setWhaleActivity] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (chain && address) {
      loadTokenData();
    }
  }, [chain, address]);

  const loadTokenData = async () => {
    setIsLoading(true);
    setError('');
    try {
      // First, get the token by chain and address
      const tokenData = await api.getTokenByAddress(chain, address);
      setToken(tokenData);
      
      // Then load signals and whale activity with token ID
      if (tokenData?.id) {
        const [signalsData, whaleData] = await Promise.all([
          api.getSignals({ tokenId: tokenData.id, limit: 20 }).catch(() => []),
          api.getTokenWhaleActivity(tokenData.id, 24).catch(() => null),
        ]);
        setSignals(signalsData);
        setWhaleActivity(whaleData);
      }
    } catch (err: any) {
      console.error('Error loading token data:', err);
      setError(err.message || 'Failed to load token data');
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

  const getLatestSignal = () => {
    if (!signals || signals.length === 0) return null;
    return signals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  };

  const getAccumulationScore = () => {
    const latestSignal = getLatestSignal();
    if (latestSignal) {
      return typeof latestSignal.score === 'number' ? latestSignal.score : parseFloat(latestSignal.score.toString());
    }
    return 0;
  };

  const getBadges = () => {
    const score = getAccumulationScore();
    const badges = [];
    if (score >= 90) badges.push({ label: 'MEGA ACCUMULATION', color: 'bg-red-500/20 text-red-400 border-red-500/30' });
    if (whaleActivity?.summary?.totalVolume && Number(whaleActivity.summary.totalVolume) > 1000000) {
      badges.push({ label: 'HIGH VOLUME', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' });
    }
    if (score >= 75) badges.push({ label: 'SMART MONEY INFLOW', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' });
    return badges;
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
          <Navbar />
          <main className="max-w-[1600px] mx-auto pt-24 pb-6 px-6">
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !token) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
          <Navbar />
          <main className="max-w-[1600px] mx-auto pt-24 pb-6 px-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
              <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
              <p className="text-gray-400 mb-4">{error || `Token not found for ${chain} chain and address ${address}`}</p>
              <Link href="/tokens" className="text-purple-400 hover:text-purple-300">
                Back to Tokens
              </Link>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    );
  }

  const accumScore = getAccumulationScore();
  const badges = getBadges();
  const latestSignal = getLatestSignal();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          {/* Token Header */}
          <div className="mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-white/5 rounded-lg transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl font-bold">
                  {token.symbol?.slice(0, 2) || '??'}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold">{token.symbol}</h1>
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-semibold">
                      {chain.toUpperCase()}
                    </span>
                    {badges.map((badge, i) => (
                      <span key={i} className={`px-3 py-1 border rounded-lg text-xs font-bold ${badge.color}`}>
                        {badge.label}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{token.name}</span>
                    <span>•</span>
                    <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
                    <a
                      href={`https://${chain === 'ethereum' ? 'etherscan.io' : chain === 'bsc' ? 'bscscan.com' : 'polygonscan.com'}/token/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-purple-400 transition"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Price Info - Placeholder */}
              <div className="text-right">
                <div className="text-5xl font-bold mb-2">$0.00</div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-xl">Price data coming soon</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-6 gap-4">
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1">Market Cap</div>
                <div className="text-xl font-bold">N/A</div>
              </div>
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1">24h Volume</div>
                <div className="text-xl font-bold">N/A</div>
              </div>
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1">Holders</div>
                <div className="text-xl font-bold">N/A</div>
              </div>
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1">Liquidity</div>
                <div className="text-xl font-bold">N/A</div>
              </div>
              <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1">FDV</div>
                <div className="text-xl font-bold">N/A</div>
              </div>
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur">
                <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Accum Score
                </div>
                <div className="text-3xl font-bold text-purple-400">{accumScore}/100</div>
              </div>
            </div>
          </div>

          {/* Accumulation Score Detail */}
          {accumScore > 0 && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8 backdrop-blur">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Target className="w-6 h-6 text-purple-400" />
                  Accumulation Score Breakdown
                </h3>
                <span className="text-4xl font-bold text-purple-400">{accumScore}/100</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
                  style={{ width: `${accumScore}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-green-400 font-bold text-lg">{accumScore}</div>
                  <div className="text-xs text-gray-400">Overall Score</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-green-400 font-bold text-lg">{whaleActivity?.summary?.eventCount || 0}</div>
                  <div className="text-xs text-gray-400">Whale Events</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-green-400 font-bold text-lg">{whaleActivity?.summary?.uniqueWallets || 0}</div>
                  <div className="text-xs text-gray-400">Unique Wallets</div>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <div className="text-yellow-400 font-bold text-lg">{signals.length}</div>
                  <div className="text-xs text-gray-400">Signals</div>
                </div>
              </div>
              {accumScore >= 75 && (
                <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
                    <CheckCircle className="w-5 h-5" />
                    ACCUMULATION PHASE - STRONG BUY SIGNAL
                  </div>
                  <p className="text-sm text-gray-300">
                    {whaleActivity?.summary?.uniqueWallets || 0} smart money wallets are actively accumulating this token.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Chart and Sidebar */}
          <div className="grid lg:grid-cols-3 gap-8 mb-8">
            {/* Chart Section */}
            <div className="lg:col-span-2">
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">Price Chart + Volume</h3>
                  <div className="flex items-center gap-2">
                    {['1H', '24H', '7D', '30D', '1Y'].map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setChartTimeframe(tf)}
                        className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${
                          chartTimeframe === tf
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-center h-[400px] text-gray-400">
                  <div className="text-center">
                    <BarChart3 className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p>Chart integration coming soon</p>
                    <p className="text-sm">(TradingView or Recharts)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Targets & Social Sentiment - Placeholder */}
            <div className="space-y-4">
              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  AI Price Targets
                </h3>
                <div className="text-center py-8 text-gray-400 text-sm">
                  Price prediction coming soon
                </div>
              </div>

              <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
                <h3 className="text-xl font-bold mb-4">Social Sentiment</h3>
                <div className="text-center py-8 text-gray-400 text-sm">
                  Social sentiment analysis coming soon
                </div>
              </div>
            </div>
          </div>

          {/* Tabs Section */}
          <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur overflow-hidden">
            <div className="border-b border-purple-500/20">
              <div className="flex items-center gap-2 p-2">
                {[
                  { id: 'transactions', label: 'Whale Transactions', icon: <Wallet className="w-4 h-4" /> },
                  { id: 'holders', label: 'Top Holders', icon: <Users className="w-4 h-4" /> },
                  { id: 'distribution', label: 'Holder Distribution', icon: <BarChart3 className="w-4 h-4" /> },
                  { id: 'smartmoney', label: 'Smart Money Flow', icon: <TrendingUp className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-semibold transition ${
                      activeTab === tab.id
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'hover:bg-white/5'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* Whale Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="space-y-3">
                  {whaleActivity?.events && whaleActivity.events.length > 0 ? (
                    whaleActivity.events.slice(0, 10).map((event: any, i: number) => (
                      <div
                        key={i}
                        className={`p-4 rounded-lg border ${
                          event.direction === 'buy'
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                        } hover:border-opacity-50 transition`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                              event.direction === 'buy'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {event.direction?.toUpperCase()}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">{event.wallet?.address?.slice(0, 6)}...{event.wallet?.address?.slice(-4)}</span>
                                {event.wallet?.label && (
                                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">
                                    {event.wallet.label}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">{getTimeAgo(event.timestamp)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-lg">
                              {event.valueUsd ? `$${(Number(event.valueUsd) / 1000).toFixed(0)}K` : 'N/A'}
                            </div>
                            <div className="text-sm text-gray-400">{event.amount ? Number(event.amount).toLocaleString() : 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      No whale transactions found
                    </div>
                  )}
                </div>
              )}

              {/* Top Holders Tab */}
              {activeTab === 'holders' && (
                <div className="text-center py-8 text-gray-400">
                  Top holders data coming soon
                </div>
              )}

              {/* Holder Distribution Tab */}
              {activeTab === 'distribution' && (
                <div className="text-center py-8 text-gray-400">
                  Holder distribution visualization coming soon
                </div>
              )}

              {/* Smart Money Flow Tab */}
              {activeTab === 'smartmoney' && (
                <div>
                  {whaleActivity ? (
                    <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-lg font-bold">Net Smart Money Flow (24h)</h4>
                        <span className="text-2xl font-bold text-green-400">
                          ${whaleActivity.summary?.totalVolume ? (Number(whaleActivity.summary.totalVolume) / 1000000).toFixed(2) + 'M' : '0'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">
                        {whaleActivity.summary?.uniqueWallets || 0} unique smart money wallets active
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      Smart money flow data coming soon
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

