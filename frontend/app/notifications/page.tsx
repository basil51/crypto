'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';

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
  } | null;
  metadata: any;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

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
        return { icon: '🐋', color: 'text-green-600', bg: 'bg-green-100' };
      case 'WHALE_SELL':
        return { icon: '🔴', color: 'text-red-600', bg: 'bg-red-100' };
      case 'EXCHANGE_DEPOSIT':
        return { icon: '📥', color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'EXCHANGE_WITHDRAWAL':
        return { icon: '📤', color: 'text-orange-600', bg: 'bg-orange-100' };
      case 'SELL_WALL_CREATED':
        return { icon: '🧱', color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'SELL_WALL_REMOVED':
        return { icon: '✅', color: 'text-green-600', bg: 'bg-green-100' };
      case 'TOKEN_BREAKOUT':
        return { icon: '🚀', color: 'text-purple-600', bg: 'bg-purple-100' };
      default:
        return { icon: '🔔', color: 'text-gray-600', bg: 'bg-gray-100' };
    }
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Notification Center</h1>
              <p className="text-gray-300 text-lg">
                View all your crypto alerts and notifications in one place
              </p>
            </div>

            {/* Filters and Actions */}
            <div className="glass shadow-soft rounded-xl p-4 mb-6 card-hover">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'all'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('unread')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === 'unread'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Unread
                  </button>
                </div>
                {notifications.some(n => !n.isRead) && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="glass shadow-soft rounded-xl overflow-hidden">
              {loading ? (
                <div className="px-4 py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-400 mt-4">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  <p className="text-gray-400 mt-4 text-lg">No notifications to display</p>
                  <p className="text-gray-500 mt-2">
                    {filter === 'unread'
                      ? "You're all caught up!"
                      : 'Notifications will appear here when you receive them'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => {
                    const alertStyle = getAlertIcon(notification.alertType);
                    return (
                      <div
                        key={notification.id}
                        className={`p-6 hover:bg-gray-50 transition-colors ${
                          !notification.isRead ? 'bg-blue-50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div
                            className={`flex-shrink-0 w-12 h-12 rounded-full ${alertStyle.bg} flex items-center justify-center text-2xl`}
                          >
                            {alertStyle.icon}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded ${alertStyle.bg} ${alertStyle.color}`}
                                  >
                                    {getAlertTypeLabel(notification.alertType)}
                                  </span>
                                  {!notification.isRead && (
                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                  )}
                                </div>
                                <p className="text-gray-900 font-medium text-lg mb-1">
                                  {notification.message}
                                </p>
                                {notification.token && (
                                  <p className="text-gray-600 text-sm mb-2">
                                    {notification.token.name} ({notification.token.symbol})
                                  </p>
                                )}
                                <p className="text-gray-400 text-sm">
                                  {formatDateTime(notification.createdAt)}
                                </p>
                              </div>

                              {/* Mark as read button */}
                              {!notification.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Mark read
                                </button>
                              )}
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

