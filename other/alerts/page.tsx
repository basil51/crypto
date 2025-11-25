import React, { useState } from 'react';
import { Bell, TrendingUp, Wallet, Zap, DollarSign, Target, Settings, Plus, X, Check } from 'lucide-react';

const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedChains, setSelectedChains] = useState(['all']);
  const [showCreateAlert, setShowCreateAlert] = useState(false);

  const chains = [
    { id: 'all', name: 'All Chains', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'eth', name: 'Ethereum', color: 'bg-blue-500' },
    { id: 'sol', name: 'Solana', color: 'bg-purple-500' },
    { id: 'base', name: 'Base', color: 'bg-blue-600' },
    { id: 'bnb', name: 'BNB Chain', color: 'bg-yellow-500' },
    { id: 'arb', name: 'Arbitrum', color: 'bg-cyan-500' },
    { id: 'poly', name: 'Polygon', color: 'bg-purple-600' },
  ];

  const alerts = [
    {
      id: 1,
      type: 'whale',
      chain: 'eth',
      token: 'PEPE',
      message: 'Whale bought $2.3M worth',
      amount: '$2,300,000',
      wallet: '0x742d...8f9a',
      time: '2 min ago',
      severity: 'high',
      icon: DollarSign,
    },
    {
      id: 2,
      type: 'accumulation',
      chain: 'sol',
      token: 'BONK',
      message: 'Accumulation score reached 87',
      score: '87/100',
      wallets: '23 smart wallets',
      time: '5 min ago',
      severity: 'high',
      icon: TrendingUp,
    },
    {
      id: 3,
      type: 'smart_money',
      chain: 'base',
      token: 'DEGEN',
      message: 'Ansem entered position',
      amount: '$450,000',
      wallet: '0x892a...3d4c',
      time: '12 min ago',
      severity: 'critical',
      icon: Wallet,
    },
    {
      id: 4,
      type: 'breakout',
      chain: 'arb',
      token: 'GMX',
      message: 'Token exiting accumulation phase',
      change: '+15.3%',
      volume: '$8.2M',
      time: '18 min ago',
      severity: 'medium',
      icon: Zap,
    },
    {
      id: 5,
      type: 'whale',
      chain: 'bnb',
      token: 'CAKE',
      message: 'Multiple whales buying',
      amount: '$1,800,000',
      wallets: '7 wallets',
      time: '23 min ago',
      severity: 'high',
      icon: Target,
    },
  ];

  const alertTypes = [
    { id: 'all', name: 'All Alerts', count: 127 },
    { id: 'whale', name: 'Whale Buys', count: 45 },
    { id: 'accumulation', name: 'Accumulation', count: 32 },
    { id: 'smart_money', name: 'Smart Money', count: 28 },
    { id: 'breakout', name: 'Breakouts', count: 22 },
  ];

  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/50 hover:border-red-500';
      case 'high':
        return 'bg-orange-500/10 border-orange-500/50 hover:border-orange-500';
      case 'medium':
        return 'bg-yellow-500/10 border-yellow-500/50 hover:border-yellow-500';
      default:
        return 'bg-blue-500/10 border-blue-500/50 hover:border-blue-500';
    }
  };

  const getChainBadge = (chainId) => {
    const chain = chains.find(c => c.id === chainId);
    return chain ? (
      <span className={`${chain.color} text-white px-2 py-0.5 rounded text-xs font-medium`}>
        {chain.name}
      </span>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Real-Time Alerts
            </h1>
            <p className="text-slate-400">Stay ahead with instant notifications on whale movements and accumulation signals</p>
          </div>
          <button
            onClick={() => setShowCreateAlert(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-purple-500/50"
          >
            <Plus size={20} />
            Create Alert
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Active Alerts</div>
            <div className="text-2xl font-bold text-purple-400">127</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Last 24h</div>
            <div className="text-2xl font-bold text-green-400">+89</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-400">12</div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-1">Delivery Rate</div>
            <div className="text-2xl font-bold text-blue-400">99.8%</div>
          </div>
        </div>

        {/* Chain Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {chains.map(chain => (
            <button
              key={chain.id}
              onClick={() => setSelectedChains(
                selectedChains.includes(chain.id)
                  ? selectedChains.filter(c => c !== chain.id)
                  : [...selectedChains, chain.id]
              )}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedChains.includes(chain.id)
                  ? `${chain.color} text-white shadow-lg`
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {chain.name}
            </button>
          ))}
        </div>

        {/* Alert Type Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {alertTypes.map(type => (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === type.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
              }`}
            >
              {type.name}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === type.id ? 'bg-white/20' : 'bg-slate-700'
              }`}>
                {type.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="max-w-7xl mx-auto space-y-4">
        {alerts.map(alert => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={`bg-slate-800/50 backdrop-blur-sm border ${getSeverityStyles(alert.severity)} rounded-xl p-6 transition-all hover:scale-[1.02] cursor-pointer`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${
                  alert.severity === 'critical' ? 'bg-red-500/20' :
                  alert.severity === 'high' ? 'bg-orange-500/20' :
                  alert.severity === 'medium' ? 'bg-yellow-500/20' :
                  'bg-blue-500/20'
                }`}>
                  <Icon size={24} className={
                    alert.severity === 'critical' ? 'text-red-400' :
                    alert.severity === 'high' ? 'text-orange-400' :
                    alert.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  } />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getChainBadge(alert.chain)}
                    <span className="text-xl font-bold">{alert.token}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-sm">{alert.time}</span>
                  </div>
                  
                  <p className="text-lg mb-3">{alert.message}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    {alert.amount && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Amount:</span>
                        <span className="font-semibold text-green-400">{alert.amount}</span>
                      </div>
                    )}
                    {alert.wallet && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Wallet:</span>
                        <span className="font-mono text-purple-400">{alert.wallet}</span>
                      </div>
                    )}
                    {alert.score && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Score:</span>
                        <span className="font-semibold text-orange-400">{alert.score}</span>
                      </div>
                    )}
                    {alert.wallets && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Wallets:</span>
                        <span className="font-semibold text-blue-400">{alert.wallets}</span>
                      </div>
                    )}
                    {alert.change && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Change:</span>
                        <span className="font-semibold text-green-400">{alert.change}</span>
                      </div>
                    )}
                    {alert.volume && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Volume:</span>
                        <span className="font-semibold text-cyan-400">{alert.volume}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors">
                  <Settings size={20} className="text-slate-400" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Alert Modal */}
      {showCreateAlert && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full p-8 border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Create New Alert</h2>
              <button
                onClick={() => setShowCreateAlert(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Alert Type</label>
                <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500">
                  <option>Whale Buy Alert</option>
                  <option>Accumulation Score</option>
                  <option>Smart Money Entry</option>
                  <option>Breakout Signal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Blockchain</label>
                <div className="grid grid-cols-3 gap-2">
                  {chains.filter(c => c.id !== 'all').map(chain => (
                    <button
                      key={chain.id}
                      className="bg-slate-900 hover:bg-slate-700 border border-slate-700 rounded-lg px-4 py-2 transition-colors"
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Minimum Amount ($)</label>
                <input
                  type="number"
                  placeholder="50000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Notification Method</label>
                <div className="space-y-2">
                  {['Browser Push', 'Telegram', 'Discord', 'Email'].map(method => (
                    <label key={method} className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-700 transition-colors">
                      <input type="checkbox" className="w-4 h-4" />
                      <span>{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-lg font-semibold transition-all shadow-lg shadow-purple-500/50">
                Create Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsPage;