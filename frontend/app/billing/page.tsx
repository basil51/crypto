'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const data = await api.getCurrentUser();
      setUserInfo(data);
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const handleSubscribe = async (plan: string = 'PRO') => {
    setLoading(true);
    try {
      const response = await api.createCheckoutSession(plan);
      // Redirect to Stripe checkout
      window.location.href = response.url;
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      alert(error.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    try {
      const response = await api.createBillingPortalSession();
      // Redirect to Stripe billing portal
      window.location.href = response.url;
    } catch (error: any) {
      console.error('Error creating billing portal session:', error);
      alert(error.message || 'Failed to open billing portal');
      setLoading(false);
    }
  };

  const isPro = userInfo?.plan === 'PRO' && 
    (userInfo?.subscriptionStatus === 'active' || 
     (userInfo?.subscriptionEndsAt && new Date(userInfo.subscriptionEndsAt) > new Date()));

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold gradient-text mb-2">Subscription & Billing</h1>
              <p className="text-gray-600 text-lg">
                Manage your subscription and access premium features
              </p>
            </div>

            {/* Current Plan Status */}
            <div className="glass shadow-soft rounded-xl p-6 mb-6 card-hover">
              <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {isPro ? (
                      <>
                        {userInfo?.subscriptionStatus === 'active' ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-yellow-600">Expiring Soon</span>
                        )}
                        {userInfo?.subscriptionEndsAt && (
                          <span className="ml-2">
                            • Renews {new Date(userInfo.subscriptionEndsAt).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    ) : (
                      'Limited features available'
                    )}
                  </div>
                </div>
                {isPro && (
                  <button
                    onClick={handleManageBilling}
                    disabled={loading}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Manage Subscription'}
                  </button>
                )}
              </div>
            </div>

            {/* Pricing Plans */}
            {!isPro && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Free Plan */}
                <div className="glass shadow-soft rounded-xl p-6 card-hover">
                  <h3 className="text-xl font-semibold mb-2">Free Plan</h3>
                  <div className="text-3xl font-bold mb-4">$0<span className="text-lg text-gray-600">/month</span></div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Basic signal alerts
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Dashboard access
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Token listings
                    </li>
                    <li className="flex items-center text-gray-400">
                      <span className="mr-2">✗</span>
                      Premium features
                    </li>
                  </ul>
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="glass shadow-soft rounded-xl p-6 card-hover border-2 border-purple-500">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold">Pro Plan</h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Popular</span>
                  </div>
                  <div className="text-3xl font-bold mb-4">$29<span className="text-lg text-gray-600">/month</span></div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      All Free features
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Whale activity tracking
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Sell wall alerts
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Advanced analytics
                    </li>
                    <li className="flex items-center">
                      <span className="text-green-500 mr-2">✓</span>
                      Priority support
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('PRO')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Subscribe to Pro'}
                  </button>
                </div>
              </div>
            )}

            {/* Features Comparison */}
            <div className="glass shadow-soft rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Feature Comparison</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feature</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Free</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">Signal Alerts</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">Basic</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-green-600">All Types</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">Whale Activity</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">Sell Wall Detection</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">Advanced Analytics</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">✓</td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">API Access</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

