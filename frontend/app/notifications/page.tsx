'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import { TrendingUp, DollarSign, Wallet, Zap, Target, Bell, Settings, Check } from 'lucide-react';

interface Notification {
  id: string;
  alertType: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  token: {
    id: string;
    symbol: string;
    name: string;
    chain?: string;
  } | null;
  metadata: any;
  signal?: {
    id: string;
    score: number | string;
    signalType: string;
    windowStart: string;
    windowEnd: string;
    walletsInvolved: any;
    metadata: any;
  } | null;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedChains, setSelectedChains] = useState<string[]>(['all']);
  const [alertTypeFilter, setAlertTypeFilter] = useState<string>('all');

  useEffect(() => {
    loadNotifications();
  }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getMyNotifications(100, filter === 'unread');
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'WHALE_BUY':
        return { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/20', severity: 'high' };
      case 'WHALE_SELL':
        return { icon: Wallet, color: 'text-red-400', bg: 'bg-red-500/20', severity: 'critical' };
      case 'EXCHANGE_DEPOSIT':
        return { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/20', severity: 'medium' };
      case 'EXCHANGE_WITHDRAWAL':
        return { icon: Target, color: 'text-orange-400', bg: 'bg-orange-500/20', severity: 'high' };
      case 'SELL_WALL_CREATED':
        return { icon: Bell, color: 'text-yellow-400', bg: 'bg-yellow-500/20', severity: 'medium' };
      case 'SELL_WALL_REMOVED':
        return { icon: Check, color: 'text-green-400', bg: 'bg-green-500/20', severity: 'low' };
      case 'TOKEN_BREAKOUT':
        return { icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20', severity: 'high' };
      case 'SIGNAL':
        return { icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20', severity: 'high' };
      default:
        return { icon: Bell, color: 'text-gray-400', bg: 'bg-gray-500/20', severity: 'medium' };
    }
  };

  const getSeverityStyles = (severity: string) => {
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

  const chains = [
    { id: 'all', name: 'All Chains', color: 'bg-gradient-to-r from-purple-500 to-pink-500' },
    { id: 'ethereum', name: 'Ethereum', color: 'bg-blue-500' },
    { id: 'bsc', name: 'BSC', color: 'bg-yellow-500' },
    { id: 'polygon', name: 'Polygon', color: 'bg-purple-600' },
    { id: 'base', name: 'Base', color: 'bg-blue-600' },
    { id: 'arbitrum', name: 'Arbitrum', color: 'bg-cyan-500' },
  ];

  const getChainBadge = (chainId: string | undefined) => {
    if (!chainId) return null;
    const chain = chains.find(c => c.id === chainId.toLowerCase());
    return chain ? (
      <span className={`${chain.color} text-white px-2.5 py-1 rounded-lg text-xs font-medium`}>
        {chain.name}
      </span>
    ) : (
      <span className="bg-gray-500/20 text-gray-400 px-2.5 py-1 rounded-lg text-xs font-medium border border-gray-500/30">
        {chainId.toUpperCase()}
      </span>
    );
  };

  // Calculate stats
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    critical: notifications.filter(n => {
      const icon = getAlertIcon(n.alertType);
      return icon.severity === 'critical';
    }).length,
    high: notifications.filter(n => {
      const icon = getAlertIcon(n.alertType);
      return icon.severity === 'high';
    }).length,
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.isRead) return false;
    if (alertTypeFilter !== 'all' && n.alertType !== alertTypeFilter) return false;
    if (!selectedChains.includes('all') && !selectedChains.includes(n.token?.chain?.toLowerCase() || '')) return false;
    return true;
  });

  const alertTypeCounts = {
    all: notifications.length,
    WHALE_BUY: notifications.filter(n => n.alertType === 'WHALE_BUY').length,
    SIGNAL: notifications.filter(n => n.alertType === 'SIGNAL').length,
    TOKEN_BREAKOUT: notifications.filter(n => n.alertType === 'TOKEN_BREAKOUT').length,
    SELL_WALL_CREATED: notifications.filter(n => n.alertType === 'SELL_WALL_CREATED').length,
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getAlertTypeLabel = (alertType: string) => {
    return alertType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getSignalTypeLabel = (signalType: string) => {
    const labels: Record<string, string> = {
      'WHALE_INFLOW': 'Whale Inflow',
      'EXCHANGE_OUTFLOW': 'Exchange Outflow',
      'LP_INCREASE': 'LP Increase',
      'CONCENTRATED_BUYS': 'Concentrated Buys',
      'HOLDING_PATTERNS': 'Holding Patterns',
    };
    return labels[signalType] || signalType;
  };

  const formatVolume = (amount: number | string | undefined): string => {
    if (!amount) return 'N/A';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatNumber = (num: number | string | undefined): string => {
    if (num === undefined || num === null) return 'N/A';
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return 'N/A';
    return n.toLocaleString();
  };

  const getScoreColor = (score: number | string): string => {
    const num = typeof score === 'string' ? parseFloat(score) : score;
    if (num >= 75) return 'text-red-400 bg-red-500/20 border-red-500/30';
    if (num >= 60) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-green-400 bg-green-500/20 border-green-500/30';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                    Real-Time Alerts
                  </h1>
                  <p className="text-gray-300 text-lg">
                    Stay ahead with instant notifications on whale movements and accumulation signals
                  </p>
                </div>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 font-semibold transition-all shadow-lg shadow-purple-500/50 flex items-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Mark all as read
                  </button>
                )}
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-black/40 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Total Alerts</div>
                  <div className="text-2xl font-bold text-purple-400">{stats.total}</div>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Unread</div>
                  <div className="text-2xl font-bold text-blue-400">{stats.unread}</div>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-red-500/20 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">Critical</div>
                  <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
                </div>
                <div className="bg-black/40 backdrop-blur-sm border border-orange-500/20 rounded-xl p-4">
                  <div className="text-gray-400 text-sm mb-1">High Priority</div>
                  <div className="text-2xl font-bold text-orange-400">{stats.high}</div>
                </div>
              </div>

              {/* Chain Filter */}
              <div className="flex flex-wrap gap-2 mb-4">
                {chains.map(chain => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      if (chain.id === 'all') {
                        setSelectedChains(['all']);
                      } else {
                        setSelectedChains(prev => 
                          prev.includes('all') 
                            ? [chain.id]
                            : prev.includes(chain.id)
                            ? prev.filter(c => c !== chain.id)
                            : [...prev.filter(c => c !== 'all'), chain.id]
                        );
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedChains.includes(chain.id)
                        ? `${chain.color} text-white shadow-lg`
                        : 'bg-black/40 border border-purple-500/30 text-gray-300 hover:bg-purple-500/10'
                    }`}
                  >
                    {chain.name}
                  </button>
                ))}
              </div>

              {/* Alert Type Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setAlertTypeFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    alertTypeFilter === 'all'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-black/40 border border-purple-500/30 text-gray-300 hover:bg-purple-500/10'
                  }`}
                >
                  All Alerts
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    alertTypeFilter === 'all' ? 'bg-white/20' : 'bg-gray-500/20'
                  }`}>
                    {alertTypeCounts.all}
                  </span>
                </button>
                <button
                  onClick={() => setAlertTypeFilter('WHALE_BUY')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    alertTypeFilter === 'WHALE_BUY'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-black/40 border border-purple-500/30 text-gray-300 hover:bg-purple-500/10'
                  }`}
                >
                  Whale Buys
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    alertTypeFilter === 'WHALE_BUY' ? 'bg-white/20' : 'bg-gray-500/20'
                  }`}>
                    {alertTypeCounts.WHALE_BUY}
                  </span>
                </button>
                <button
                  onClick={() => setAlertTypeFilter('SIGNAL')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    alertTypeFilter === 'SIGNAL'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-black/40 border border-purple-500/30 text-gray-300 hover:bg-purple-500/10'
                  }`}
                >
                  Accumulation
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    alertTypeFilter === 'SIGNAL' ? 'bg-white/20' : 'bg-gray-500/20'
                  }`}>
                    {alertTypeCounts.SIGNAL}
                  </span>
                </button>
                <button
                  onClick={() => setAlertTypeFilter('TOKEN_BREAKOUT')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    alertTypeFilter === 'TOKEN_BREAKOUT'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                      : 'bg-black/40 border border-purple-500/30 text-gray-300 hover:bg-purple-500/10'
                  }`}
                >
                  Breakouts
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    alertTypeFilter === 'TOKEN_BREAKOUT' ? 'bg-white/20' : 'bg-gray-500/20'
                  }`}>
                    {alertTypeCounts.TOKEN_BREAKOUT}
                  </span>
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div>
              {loading ? (
                <div className="px-4 py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-400 mt-4">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="px-4 py-12 text-center bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl">
                  <Bell className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="text-gray-400 mt-4 text-lg">No notifications to display</p>
                  <p className="text-gray-500 mt-2">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : 'Try adjusting your filters or check back later'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => {
                    const alertStyle = getAlertIcon(notification.alertType);
                    const Icon = alertStyle.icon;
                    const score = notification.signal 
                      ? (typeof notification.signal.score === 'string' 
                          ? parseFloat(notification.signal.score) 
                          : notification.signal.score)
                      : null;
                    
                    return (
                      <div
                        key={notification.id}
                        className={`bg-gradient-to-br from-slate-800/90 via-purple-900/40 to-slate-800/90 backdrop-blur-md border ${getSeverityStyles(alertStyle.severity)} rounded-xl p-6 transition-all hover:scale-[1.01] shadow-xl ${
                          !notification.isRead ? 'ring-2 ring-blue-500/30 bg-gradient-to-br from-slate-800/95 via-blue-900/30 to-slate-800/95' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-3 rounded-lg ${alertStyle.bg} border ${alertStyle.bg.replace('/20', '/30')} flex-shrink-0 shadow-md`}>
                            <Icon size={24} className={alertStyle.color} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            {/* Header Row */}
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              {getChainBadge(notification.token?.chain)}
                              {notification.token && (
                                <span className="text-xl font-bold text-white">{notification.token.symbol}</span>
                              )}
                              <span className="text-gray-500">•</span>
                              <span className="text-gray-400 text-sm">{formatDateTime(notification.createdAt)}</span>
                              {!notification.isRead && (
                                <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                              )}
                            </div>
                            
                            {/* Message */}
                            <p className="text-lg text-gray-200 mb-3">{notification.message}</p>
                            
                            {/* Score Display (if signal) */}
                            {notification.signal && score !== null && (
                              <div className={`mb-3 p-3 rounded-lg border ${getScoreColor(notification.signal.score)} inline-block`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400 uppercase tracking-wide">Score:</span>
                                  <span className={`text-xl font-bold ${getScoreColor(notification.signal.score).split(' ')[0]}`}>
                                    {score.toFixed(1)}/100
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Stats Row */}
                            <div className="flex flex-wrap gap-4 text-sm mt-3">
                              {notification.signal?.metadata?.totalVolume && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Volume:</span>
                                  <span className="font-semibold text-green-400">
                                    {formatVolume(notification.signal.metadata.totalVolume)}
                                  </span>
                                </div>
                              )}
                              {notification.signal?.metadata?.transactionCount && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Transactions:</span>
                                  <span className="font-semibold text-blue-400">
                                    {formatNumber(notification.signal.metadata.transactionCount)}
                                  </span>
                                </div>
                              )}
                              {notification.signal?.walletsInvolved && Array.isArray(notification.signal.walletsInvolved) && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Wallets:</span>
                                  <span className="font-semibold text-purple-400">
                                    {notification.signal.walletsInvolved.length}
                                  </span>
                                </div>
                              )}
                              {notification.signal?.metadata?.averageBuySize && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Avg Buy:</span>
                                  <span className="font-semibold text-yellow-400">
                                    {formatVolume(notification.signal.metadata.averageBuySize)}
                                  </span>
                                </div>
                              )}
                              {/* Non-signal metadata */}
                              {!notification.signal && notification.metadata?.amount && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Amount:</span>
                                  <span className="font-semibold text-green-400">
                                    {formatVolume(notification.metadata.amount)}
                                  </span>
                                </div>
                              )}
                              {!notification.signal && notification.metadata?.exchange && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Exchange:</span>
                                  <span className="font-semibold text-orange-400">
                                    {notification.metadata.exchange}
                                  </span>
                                </div>
                              )}
                              {!notification.signal && notification.metadata?.price && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">Price:</span>
                                  <span className="font-semibold text-white">
                                    ${formatNumber(notification.metadata.price)}
                                  </span>
                                </div>
                              )}
                              {!notification.signal && notification.metadata?.volume24h && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">24h Volume:</span>
                                  <span className="font-semibold text-green-400">
                                    {formatVolume(notification.metadata.volume24h)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-purple-500/20">
                              {notification.signal && (
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${getScoreColor(notification.signal.score)}`}>
                                  {getSignalTypeLabel(notification.signal.signalType)}
                                </span>
                              )}
                              <div className="flex items-center gap-3">
                                {notification.token && (
                                  <Link
                                    href={`/token/${notification.token.chain?.toLowerCase() || 'ethereum'}/${notification.token.symbol.toLowerCase()}`}
                                    className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 font-medium transition-colors"
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                    View Details
                                  </Link>
                                )}
                                {!notification.isRead && (
                                  <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="p-2 hover:bg-purple-500/10 rounded-lg transition-colors"
                                  >
                                    <Check size={18} className="text-blue-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

