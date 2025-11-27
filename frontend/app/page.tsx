'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, ArrowRight, BarChart3, Wallet, Search } from 'lucide-react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { wsClient } from '@/lib/websocket';

interface TopToken {
  rank: number;
  symbol: string;
  chain: string;
  price: string;
  change: string;
  accumScore: number;
  whaleFlow: string;
  tokenId?: string;
  contractAddress?: string;
}

interface WhaleTx {
  wallet: string;
  action: string;
  amount: string;
  token: string;
  chain: string;
  time: string;
}

interface Stats {
  walletsTracked: number;
  volumeTracked: number;
  alertsSent: number;
  accuracy: number;
}

export default function Homepage() {
  const [topTokens, setTopTokens] = useState<TopToken[]>([]);
  const [whaleTxs, setWhaleTxs] = useState<WhaleTx[]>([]);
  const [stats, setStats] = useState<Stats>({
    walletsTracked: 0,
    volumeTracked: 0,
    alertsSent: 0,
    accuracy: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHomepageData();

    // Only run WebSocket on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Set up WebSocket for real-time updates (if authenticated)
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        wsClient.connect(token);

        // Handle whale transactions
        const handleWhaleTransaction = (data: any) => {
          setWhaleTxs((prev) => [data, ...prev].slice(0, 10));
        };

        // Handle stats updates
        const handleStatsUpdate = (data: any) => {
          if (data.stats) {
            setStats(data.stats);
          }
        };

        wsClient.on('whale_transaction', handleWhaleTransaction);
        wsClient.on('stats_update', handleStatsUpdate);

        // Fallback: poll every 60 seconds as backup
        const interval = setInterval(() => {
          loadHomepageData();
        }, 60000);

        return () => {
          wsClient.off('whale_transaction', handleWhaleTransaction);
          wsClient.off('stats_update', handleStatsUpdate);
          clearInterval(interval);
        };
      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        // Fallback to polling
        const interval = setInterval(() => {
          loadHomepageData();
        }, 30000);
        return () => clearInterval(interval);
      }
    } else {
      // Public users: poll every 30 seconds
      const interval = setInterval(() => {
        loadHomepageData();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, []);

  const loadHomepageData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load all data in parallel
      const [statsData, tokensData, transactionsData] = await Promise.all([
        api.getHomepageStats(),
        api.getTopAccumulatingTokens(10),
        api.getRecentWhaleTransactions(10),
      ]);

      setStats(statsData);
      setTopTokens(tokensData);
      setWhaleTxs(transactionsData);
    } catch (err: any) {
      console.error('Failed to load homepage data:', err);
      setError(err.message || 'Failed to load data');
      // Keep existing data on error
    } finally {
      setIsLoading(false);
    }
  };

  const chains = ['ETH', 'SOL', 'BASE', 'BSC', 'ARB', 'MATIC'];
  
  const features = [
    { icon: <Zap className="w-6 h-6" />, title: 'Real-Time Whale Alerts', desc: 'Get instant notifications when smart money moves' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Accumulation Score', desc: 'AI-powered scoring system (0-100) for entry timing' },
    { icon: <Wallet className="w-6 h-6" />, title: 'Smart Money Tracker', desc: 'Follow top 1% wallets with proven track records' },
    { icon: <Search className="w-6 h-6" />, title: 'Alpha Screener', desc: 'Find hidden gems before they pump 100x' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">
                {isLoading ? 'Loading...' : `${stats.walletsTracked.toLocaleString()} smart wallets tracked live`}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Follow Smart Money,<br />Before It&apos;s Too Late
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Track whale accumulation across 6 chains. Get alerted when smart money enters. 
              Find the next 100x before everyone else.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition flex items-center gap-2">
                Start 7-Day Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/10 transition">
                Watch Demo
              </button>
            </div>
          </div>

          {/* Supported Chains */}
          <div className="flex items-center justify-center gap-4 mb-16">
            {chains.map((chain) => (
              <div key={chain} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg backdrop-blur text-sm font-semibold">
                {chain}
              </div>
            ))}
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">
                {isLoading ? '...' : stats.walletsTracked.toLocaleString()}
              </div>
              <div className="text-gray-400">Wallets Tracked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">
                {isLoading ? '...' : `$${stats.volumeTracked.toFixed(1)}B`}
              </div>
              <div className="text-gray-400">Volume Tracked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">
                {isLoading ? '...' : stats.alertsSent.toLocaleString()}
              </div>
              <div className="text-gray-400">Alerts Sent</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">
                {isLoading ? '...' : `${stats.accuracy}%`}
              </div>
              <div className="text-gray-400">Accuracy</div>
            </div>
          </div>

          {/* Top 10 Accumulating Tokens */}
          <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-400" />
                Top 10 Accumulating Tokens Right Now
              </h2>
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm">LIVE</span>
              </div>
            </div>
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            {isLoading && topTokens.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : topTokens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No accumulating tokens found. Check back soon!
              </div>
            ) : (
              <div className="space-y-3">
                {topTokens.map((token) => (
                  <Link
                    key={token.rank}
                    href={`/token/${token.chain.toLowerCase()}/${token.contractAddress === '0x0000000000000000000000000000000000000000' ? token.symbol.toLowerCase() : (token.contractAddress || token.symbol.toLowerCase())}`}
                    className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold">
                        {token.rank}
                      </div>
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          {token.symbol}
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                            {token.chain}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">{token.price}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-green-400 font-semibold">{token.change}</div>
                        <div className="text-xs text-gray-400">24h</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-gray-700 rounded-full h-2">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{width: `${token.accumScore}%`}}></div>
                          </div>
                          <span className="text-sm font-bold">{token.accumScore}</span>
                        </div>
                        <div className="text-xs text-gray-400">Score</div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-400 font-semibold">{token.whaleFlow}</div>
                        <div className="text-xs text-gray-400">Whale Flow</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Live Whale Transactions */}
          <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-purple-400" />
              Live Whale Transactions
            </h2>
            {isLoading && whaleTxs.length === 0 ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : whaleTxs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                No recent whale transactions. Check back soon!
              </div>
            ) : (
              <div className="space-y-3">
                {whaleTxs.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span className="font-mono text-sm text-gray-400">{tx.wallet}</span>
                      <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg font-semibold">
                        {tx.action}
                      </span>
                      <span className="text-xl font-bold">{tx.amount}</span>
                      <span className="text-gray-400">of</span>
                      <span className="font-bold">{tx.token}</span>
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                        {tx.chain}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">{tx.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, i) => (
              <div key={i} className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-12 text-center">
            <h2 className="text-4xl font-bold mb-4">Ready to Trade Like a Whale?</h2>
            <p className="text-xl text-gray-300 mb-8">Join 10,000+ traders who never miss accumulation phases</p>
            <Link href="/register" className="px-10 py-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition inline-block">
              Start Your Free Trial Now
            </Link>
            <p className="text-sm text-gray-400 mt-4">No credit card required • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto text-center text-gray-400">
          <p>© 2025 SmartFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
