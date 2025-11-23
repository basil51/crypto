import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowLeft, Star, Bell, Share2, ExternalLink, TrendingDown, Droplet, Users, Wallet, BarChart3, Activity, AlertTriangle, CheckCircle, Clock, Flame, Target } from 'lucide-react';

export default function TokenDetailPage() {
  const [activeTab, setActiveTab] = useState('transactions');
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState('24h');

  // Mock token data
  const tokenData = {
    symbol: 'PEPE',
    name: 'Pepe',
    chain: 'ETH',
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    price: '$0.00001234',
    priceChange24h: '+156.8%',
    priceChange7d: '+234.5%',
    marketCap: '$5.2B',
    volume24h: '$845.2M',
    holders: '124,589',
    accumScore: 94,
    liquidity: '$45.2M',
    fdv: '$5.2B',
    ath: '$0.00004382',
    atl: '$0.000000056',
  };

  const badges = [
    { label: 'MEGA ACCUMULATION', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
    { label: 'HIGH VOLUME', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
    { label: 'SMART MONEY INFLOW', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ];

  const whaleTransactions = [
    { time: '2m ago', wallet: '0x1a2b...c3d4', walletName: 'Wintermute', action: 'BUY', amount: '$524,000', tokens: '42.4M PEPE', price: '$0.00001234', txHash: '0xabc...123', walletScore: 95 },
    { time: '8m ago', wallet: '0x5e6f...a7b8', walletName: 'GSR Markets', action: 'BUY', amount: '$387,000', tokens: '31.3M PEPE', price: '$0.00001236', txHash: '0xdef...456', walletScore: 92 },
    { time: '15m ago', wallet: '0x9c0d...e1f2', walletName: null, action: 'BUY', amount: '$256,000', tokens: '20.7M PEPE', price: '$0.00001237', txHash: '0xghi...789', walletScore: 88 },
    { time: '23m ago', wallet: '0x3f4a...b5c6', walletName: 'Cumberland', action: 'SELL', amount: '$145,000', tokens: '11.7M PEPE', price: '$0.00001239', txHash: '0xjkl...012', walletScore: 85 },
    { time: '31m ago', wallet: '0x7d8e...f9a0', walletName: null, action: 'BUY', amount: '$198,000', tokens: '16.0M PEPE', price: '$0.00001238', txHash: '0xmno...345', walletScore: 82 },
  ];

  const holderDistribution = [
    { type: 'Top 10 Holders', percentage: 45, count: '10', color: 'from-red-500 to-red-600' },
    { type: 'Top 50 Holders', percentage: 28, count: '40', color: 'from-orange-500 to-orange-600' },
    { type: 'Top 100 Holders', percentage: 15, count: '50', color: 'from-yellow-500 to-yellow-600' },
    { type: 'Others', percentage: 12, count: '124,489', color: 'from-green-500 to-green-600' },
  ];

  const smartMoneyFlow = [
    { date: 'Today', inflow: '$2.3M', outflow: '$450K', net: '+$1.85M', wallets: 28 },
    { date: 'Yesterday', inflow: '$1.8M', outflow: '$620K', net: '+$1.18M', wallets: 23 },
    { date: '2 days ago', inflow: '$1.2M', outflow: '$380K', net: '+$820K', wallets: 19 },
    { date: '3 days ago', inflow: '$950K', outflow: '$290K', net: '+$660K', wallets: 17 },
  ];

  const topHolders = [
    { rank: 1, address: '0x742d...ef89', name: 'Wintermute', balance: '2.5B PEPE', percentage: '4.8%', value: '$30.8M', change24h: '+2.3%' },
    { rank: 2, address: '0xa5b3...cd12', name: 'GSR Markets', balance: '2.1B PEPE', percentage: '4.0%', value: '$25.9M', change24h: '+1.8%' },
    { rank: 3, address: '0x8f2c...ab34', name: 'Binance Hot Wallet', balance: '1.8B PEPE', percentage: '3.5%', value: '$22.2M', change24h: '-0.5%' },
    { rank: 4, address: '0x4e7d...fg56', name: null, balance: '1.5B PEPE', percentage: '2.9%', value: '$18.5M', change24h: '+3.1%' },
    { rank: 5, address: '0x9a1b...hi78', name: 'Cumberland', balance: '1.2B PEPE', percentage: '2.3%', value: '$14.8M', change24h: '+1.2%' },
  ];

  const socialSentiment = {
    score: 87,
    mentions24h: '15.2K',
    sentiment: 'Very Bullish',
    trending: true,
    twitterEngagement: '+342%',
    redditPosts: '1.2K'
  };

  const priceTargets = [
    { timeframe: '24h', target: '$0.00001456', change: '+18%', probability: 78 },
    { timeframe: '7d', target: '$0.00002134', change: '+73%', probability: 65 },
    { timeframe: '30d', target: '$0.00003891', change: '+215%', probability: 52 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 bg-black/40 backdrop-blur-xl border-b border-purple-500/20 z-50">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-white/5 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold">SmartFlow</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsWatchlisted(!isWatchlisted)}
              className={`px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 ${
                isWatchlisted 
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <Star className={`w-4 h-4 ${isWatchlisted ? 'fill-yellow-400' : ''}`} />
              {isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}
            </button>
            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Set Alert
            </button>
            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Token Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl font-bold">
                {tokenData.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{tokenData.symbol}</h1>
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-semibold">
                    {tokenData.chain}
                  </span>
                  {badges.map((badge, i) => (
                    <span key={i} className={`px-3 py-1 border rounded-lg text-xs font-bold ${badge.color}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>{tokenData.name}</span>
                  <span>•</span>
                  <span className="font-mono">{tokenData.address.slice(0, 10)}...{tokenData.address.slice(-8)}</span>
                  <button className="hover:text-purple-400 transition">
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Price Info */}
            <div className="text-right">
              <div className="text-5xl font-bold mb-2">{tokenData.price}</div>
              <div className="flex items-center gap-4">
                <span className="text-green-400 text-xl font-semibold flex items-center gap-1">
                  <TrendingUp className="w-5 h-5" />
                  {tokenData.priceChange24h}
                </span>
                <span className="text-gray-400">24h</span>
                <span className="text-green-400 font-semibold">{tokenData.priceChange7d}</span>
                <span className="text-gray-400">7d</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-6 gap-4">
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1">Market Cap</div>
              <div className="text-xl font-bold">{tokenData.marketCap}</div>
            </div>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1">24h Volume</div>
              <div className="text-xl font-bold">{tokenData.volume24h}</div>
            </div>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1">Holders</div>
              <div className="text-xl font-bold">{tokenData.holders}</div>
            </div>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1">Liquidity</div>
              <div className="text-xl font-bold">{tokenData.liquidity}</div>
            </div>
            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1">FDV</div>
              <div className="text-xl font-bold">{tokenData.fdv}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 backdrop-blur">
              <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                Accum Score
              </div>
              <div className="text-3xl font-bold text-purple-400">{tokenData.accumScore}/100</div>
            </div>
          </div>
        </div>

        {/* Accumulation Score Detail */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 mb-8 backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" />
              Accumulation Score Breakdown
            </h3>
            <span className="text-4xl font-bold text-purple-400">{tokenData.accumScore}/100</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
            <div 
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all"
              style={{width: `${tokenData.accumScore}%`}}
            ></div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-green-400 font-bold text-lg">92</div>
              <div className="text-xs text-gray-400">Smart Money Activity</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-green-400 font-bold text-lg">95</div>
              <div className="text-xs text-gray-400">Whale Accumulation</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-green-400 font-bold text-lg">91</div>
              <div className="text-xs text-gray-400">Holder Distribution</div>
            </div>
            <div className="text-center p-3 bg-white/5 rounded-lg">
              <div className="text-yellow-400 font-bold text-lg">88</div>
              <div className="text-xs text-gray-400">Volume Trend</div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 font-semibold mb-1">
              <CheckCircle className="w-5 h-5" />
              ACCUMULATION PHASE - STRONG BUY SIGNAL
            </div>
            <p className="text-sm text-gray-300">28 smart money wallets are actively accumulating. Historical patterns suggest potential 150-250% upside in next 7-14 days.</p>
          </div>
        </div>

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
                  <p>Chart would be rendered here</p>
                  <p className="text-sm">(Integration with TradingView or Recharts)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Targets & Social Sentiment */}
          <div className="space-y-4">
            {/* AI Price Targets */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                AI Price Targets
              </h3>
              <div className="space-y-3">
                {priceTargets.map((target, i) => (
                  <div key={i} className="p-4 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{target.timeframe}</span>
                      <span className="text-green-400 font-bold">{target.change}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">{target.target}</span>
                      <div className="text-right">
                        <div className="text-xs text-gray-400">Probability</div>
                        <div className="font-bold text-purple-400">{target.probability}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Sentiment */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <h3 className="text-xl font-bold mb-4">Social Sentiment</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Overall Score</span>
                  <span className="text-2xl font-bold text-green-400">{socialSentiment.score}/100</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                    style={{width: `${socialSentiment.score}%`}}
                  ></div>
                </div>
                <div className="mt-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-lg inline-block font-semibold text-sm">
                  {socialSentiment.sentiment}
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">24h Mentions</span>
                  <span className="font-bold">{socialSentiment.mentions24h}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">Twitter Engagement</span>
                  <span className="font-bold text-green-400">{socialSentiment.twitterEngagement}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400">Reddit Posts</span>
                  <span className="font-bold">{socialSentiment.redditPosts}</span>
                </div>
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
                {whaleTransactions.map((tx, i) => (
                  <div 
                    key={i} 
                    className={`p-4 rounded-lg border ${
                      tx.action === 'BUY' 
                        ? 'bg-green-500/10 border-green-500/30' 
                        : 'bg-red-500/10 border-red-500/30'
                    } hover:border-opacity-50 transition cursor-pointer`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                          tx.action === 'BUY' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {tx.action}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{tx.wallet}</span>
                            {tx.walletName && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">
                                {tx.walletName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{tx.time}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{tx.amount}</div>
                        <div className="text-sm text-gray-400">{tx.tokens}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-gray-400">Price: </span>
                          <span className="font-semibold">{tx.price}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Wallet Score: </span>
                          <span className="font-bold text-purple-400">{tx.walletScore}/100</span>
                        </div>
                      </div>
                      <button className="text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        View TX <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Holders Tab */}
            {activeTab === 'holders' && (
              <div className="space-y-3">
                {topHolders.map((holder) => (
                  <div key={holder.rank} className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          holder.rank === 1 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                          holder.rank === 2 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                          holder.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
                          'bg-gradient-to-br from-purple-500 to-pink-500'
                        }`}>
                          #{holder.rank}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{holder.address}</span>
                            {holder.name && (
                              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-semibold">
                                {holder.name}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">{holder.balance}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{holder.value}</div>
                        <div className={`text-sm ${holder.change24h.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {holder.change24h} 24h
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-400">Portfolio %: </span>
                        <span className="font-bold">{holder.percentage}</span>
                      </div>
                      <button className="text-purple-400 hover:text-purple-300">View Wallet →</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Holder Distribution Tab */}
            {activeTab === 'distribution' && (
              <div>
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-4">Holder Distribution Breakdown</h4>
                  <div className="space-y-3">
                    {holderDistribution.map((dist, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{dist.type}</span>
                            <span className="text-sm text-gray-400">({dist.count} wallets)</span>
                          </div>
                          <span className="font-bold text-lg">{dist.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3">
                          <div 
                            className={`bg-gradient-to-r ${dist.color} h-3 rounded-full transition-all`}
                            style={{width: `${dist.percentage}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Concentration Risk</div>
                    <div className="text-2xl font-bold text-yellow-400">Medium</div>
                    <p className="text-xs text-gray-400 mt-2">Top 10 holders control 45% of supply</p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Distribution Health</div>
                    <div className="text-2xl font-bold text-green-400">Good</div>
                    <p className="text-xs text-gray-400 mt-2">124K+ holders, growing daily</p>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Money Flow Tab */}
            {activeTab === 'smartmoney' && (
              <div>
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold">Net Smart Money Flow (7d)</h4>
                    <span className="text-2xl font-bold text-green-400">+$5.3M</span>
                  </div>
                  <p className="text-sm text-gray-400">28 unique smart money wallets actively accumulating</p>
                </div>
                <div className="space-y-3">
                  {smartMoneyFlow.map((flow, i) => (
                    <div key={i} className="p-4 bg-white/5 hover:bg-white/10 rounded-lg transition">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold">{flow.date}</span>
                        <span className="text-lg font-bold text-green-400">{flow.net}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400 mb-1">Inflow</div>
                          <div className="font-bold text-green-400">{flow.inflow}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">Outflow</div>
                          <div className="font-bold text-red-400">{flow.outflow}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 mb-1">Active Wallets</div>
                          <div className="font-bold">{flow.wallets}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}