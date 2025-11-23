import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Eye, Shield, ArrowRight, Bell, BarChart3, Wallet, Search } from 'lucide-react';

export default function Homepage() {
  const [topTokens, setTopTokens] = useState([
    { rank: 1, symbol: 'PEPE', chain: 'ETH', price: '$0.00001234', change: '+156%', accumScore: 94, whaleFlow: '+$2.3M' },
    { rank: 2, symbol: 'WIF', chain: 'SOL', price: '$1.82', change: '+89%', accumScore: 91, whaleFlow: '+$1.8M' },
    { rank: 3, symbol: 'DEGEN', chain: 'BASE', price: '$0.0145', change: '+67%', accumScore: 88, whaleFlow: '+$1.2M' },
    { rank: 4, symbol: 'BONK', chain: 'SOL', price: '$0.00003', change: '+52%', accumScore: 85, whaleFlow: '+$890K' },
    { rank: 5, symbol: 'MEME', chain: 'ETH', price: '$0.032', change: '+45%', accumScore: 82, whaleFlow: '+$750K' },
  ]);

  const [whaleTxs, setWhaleTxs] = useState([
    { wallet: '0x1a2b...c3d4', action: 'BOUGHT', amount: '$524K', token: 'PEPE', chain: 'ETH', time: '2s ago' },
    { wallet: '0x5e6f...a7b8', action: 'BOUGHT', amount: '$387K', token: 'WIF', chain: 'SOL', time: '15s ago' },
    { wallet: '0x9c0d...e1f2', action: 'BOUGHT', amount: '$256K', token: 'BONK', chain: 'SOL', time: '28s ago' },
  ]);

  const [stats, setStats] = useState({
    walletsTracked: 12847,
    volumeTracked: 8.4,
    alertsSent: 156234,
    accuracy: 87
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        walletsTracked: prev.walletsTracked + Math.floor(Math.random() * 3),
        volumeTracked: prev.volumeTracked + Math.random() * 0.1,
        alertsSent: prev.alertsSent + Math.floor(Math.random() * 5),
        accuracy: prev.accuracy
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const chains = ['ETH', 'SOL', 'BASE', 'BSC', 'ARB', 'MATIC'];
  
  const features = [
    { icon: <Zap className="w-6 h-6" />, title: 'Real-Time Whale Alerts', desc: 'Get instant notifications when smart money moves' },
    { icon: <BarChart3 className="w-6 h-6" />, title: 'Accumulation Score', desc: 'AI-powered scoring system (0-100) for entry timing' },
    { icon: <Wallet className="w-6 h-6" />, title: 'Smart Money Tracker', desc: 'Follow top 1% wallets with proven track records' },
    { icon: <Search className="w-6 h-6" />, title: 'Alpha Screener', desc: 'Find hidden gems before they pump 100x' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black/40 backdrop-blur-xl border-b border-purple-500/20 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">SmartFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="hover:text-purple-400 transition">Dashboard</a>
            <a href="#" className="hover:text-purple-400 transition">Whales</a>
            <a href="#" className="hover:text-purple-400 transition">Screener</a>
            <a href="#" className="hover:text-purple-400 transition">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="px-4 py-2 hover:text-purple-400 transition">Login</button>
            <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition">
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full mb-6">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm">12,847 smart wallets tracked live</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Follow Smart Money,<br />Before It's Too Late
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Track whale accumulation across 6 chains. Get alerted when smart money enters. 
              Find the next 100x before everyone else.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition flex items-center gap-2">
                Start 7-Day Free Trial <ArrowRight className="w-5 h-5" />
              </button>
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
              <div className="text-3xl font-bold mb-2">{stats.walletsTracked.toLocaleString()}</div>
              <div className="text-gray-400">Wallets Tracked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">${stats.volumeTracked.toFixed(1)}B</div>
              <div className="text-gray-400">Volume Tracked</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">{stats.alertsSent.toLocaleString()}</div>
              <div className="text-gray-400">Alerts Sent</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl p-6 backdrop-blur">
              <div className="text-3xl font-bold mb-2">{stats.accuracy}%</div>
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
            <div className="space-y-3">
              {topTokens.map((token) => (
                <div key={token.rank} className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer">
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
                </div>
              ))}
            </div>
          </div>

          {/* Live Whale Transactions */}
          <div className="bg-black/40 border border-purple-500/20 rounded-2xl p-8 backdrop-blur mb-16">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Wallet className="w-6 h-6 text-purple-400" />
              Live Whale Transactions
            </h2>
            <div className="space-y-3">
              {whaleTxs.map((tx, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 rounded-xl animate-pulse">
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
            <button className="px-10 py-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl font-semibold text-lg hover:shadow-2xl hover:shadow-purple-500/50 transition">
              Start Your Free Trial Now
            </button>
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