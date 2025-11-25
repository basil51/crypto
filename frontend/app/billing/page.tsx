'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PaymentMethod = 'STRIPE' | 'BINANCE_PAY' | 'USDT_MANUAL';

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('STRIPE');
  const [usdtPayment, setUsdtPayment] = useState<any>(null);

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
      if (selectedPaymentMethod === 'STRIPE') {
        const response = await api.createCheckoutSession(plan);
        // Redirect to Stripe checkout
        window.location.href = response.url;
      } else if (selectedPaymentMethod === 'BINANCE_PAY') {
        const response = await api.createBinancePayOrder(plan, 29, 'USDT');
        // Redirect to Binance Pay QR code or payment page
        if (response.qrCodeUrl) {
          window.open(response.qrCodeUrl, '_blank');
        } else {
          alert('Binance Pay order created. Please check your payment status.');
        }
        setLoading(false);
      } else if (selectedPaymentMethod === 'USDT_MANUAL') {
        // Create payment and show USDT address
        const payment = await api.createPayment(plan, 'USDT_MANUAL', 29, 'USDT');
        setUsdtPayment(payment);
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      alert(error.message || 'Failed to create payment');
      setLoading(false);
    }
  };

  const handleVerifyUSDT = async (paymentId: string, txHash: string) => {
    if (!txHash.trim()) {
      alert('Please enter transaction hash');
      return;
    }
    setLoading(true);
    try {
      await api.verifyUSDTPayment(paymentId, txHash);
      alert('Payment verification submitted. Your subscription will be activated once confirmed.');
      setUsdtPayment(null);
      await loadUserInfo();
    } catch (error: any) {
      console.error('Error verifying payment:', error);
      alert(error.message || 'Failed to verify payment');
    } finally {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">Subscription & Billing</h1>
              <p className="text-gray-300 text-lg">
                Manage your subscription and access premium features
              </p>
            </div>

            {/* Current Plan Status */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Current Plan</h2>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">
                    {isPro ? 'Pro Plan' : 'Free Plan'}
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {isPro ? (
                      <>
                        {userInfo?.subscriptionStatus === 'active' ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-yellow-400">Expiring Soon</span>
                        )}
                        {userInfo?.subscriptionEndsAt && (
                          <span className="ml-2 text-gray-400">
                            • Renews {new Date(userInfo.subscriptionEndsAt).toLocaleDateString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400">Limited features available</span>
                    )}
                  </div>
                </div>
                {isPro && (
                  <button
                    onClick={handleManageBilling}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-colors"
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
                <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6">
                  <h3 className="text-xl font-semibold mb-2 text-white">Free Plan</h3>
                  <div className="text-3xl font-bold mb-4 text-white">$0<span className="text-lg text-gray-400">/month</span></div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Basic signal alerts
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Dashboard access
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Token listings
                    </li>
                    <li className="flex items-center text-gray-500">
                      <span className="mr-2">✗</span>
                      Premium features
                    </li>
                  </ul>
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-500/20 text-gray-500 rounded-lg cursor-not-allowed border border-gray-500/30"
                  >
                    Current Plan
                  </button>
                </div>

                {/* Pro Plan */}
                <div className="bg-black/40 border-2 border-purple-500/50 rounded-2xl backdrop-blur-xl p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold text-white">Pro Plan</h3>
                    <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">Popular</span>
                  </div>
                  <div className="text-3xl font-bold mb-4 text-white">$29<span className="text-lg text-gray-400">/month</span></div>
                  <ul className="space-y-2 mb-4">
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      All Free features
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Whale activity tracking
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Sell wall alerts
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Advanced analytics
                    </li>
                    <li className="flex items-center text-gray-300">
                      <span className="text-green-400 mr-2">✓</span>
                      Priority support
                    </li>
                  </ul>

                  {/* Payment Method Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Payment Method</label>
                    <select
                      value={selectedPaymentMethod}
                      onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 bg-black/40 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="STRIPE">Credit Card (Stripe)</option>
                      <option value="BINANCE_PAY">Binance Pay (USDT)</option>
                      <option value="USDT_MANUAL">USDT Manual Transfer</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleSubscribe('PRO')}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Processing...' : 'Subscribe to Pro'}
                  </button>
                </div>
              </div>
            )}

            {/* USDT Manual Payment Modal */}
            {usdtPayment && (
              <div className="bg-black/40 border-2 border-yellow-500/50 rounded-2xl backdrop-blur-xl p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 text-yellow-400">USDT Payment Instructions</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Payment Address</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={usdtPayment.usdtAddress || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-purple-500/30 rounded-lg bg-black/40 text-white font-mono text-sm"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(usdtPayment.usdtAddress || '');
                          alert('Address copied to clipboard!');
                        }}
                        className="px-3 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-purple-500/30"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Network</label>
                    <div className="px-3 py-2 border border-purple-500/30 rounded-lg bg-black/40 text-white">
                      {usdtPayment.usdtNetwork || 'TRC20'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Amount</label>
                    <div className="px-3 py-2 border border-purple-500/30 rounded-lg bg-black/40 text-white font-semibold">
                      {usdtPayment.usdtAmount ? Number(usdtPayment.usdtAmount).toFixed(2) : '29.00'} USDT
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-sm text-yellow-400">
                      <strong>Important:</strong> Send exactly {usdtPayment.usdtAmount ? Number(usdtPayment.usdtAmount).toFixed(2) : '29.00'} USDT to the address above using {usdtPayment.usdtNetwork || 'TRC20'} network. 
                      Payment expires in 15 minutes.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Transaction Hash (after sending)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="txHash"
                        placeholder="Enter transaction hash"
                        className="flex-1 px-3 py-2 border border-purple-500/30 rounded-lg bg-black/40 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={() => {
                          const txHash = (document.getElementById('txHash') as HTMLInputElement)?.value;
                          if (txHash) {
                            handleVerifyUSDT(usdtPayment.id, txHash);
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 transition-colors"
                      >
                        Verify Payment
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setUsdtPayment(null)}
                    className="w-full px-4 py-2 bg-gray-500/20 border border-gray-500/30 text-gray-300 rounded-lg hover:bg-gray-500/30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Features Comparison */}
            <div className="bg-black/40 border border-purple-500/20 rounded-2xl backdrop-blur-xl p-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Feature Comparison</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-purple-500/20">
                  <thead className="bg-purple-500/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Feature</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Free</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Pro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-500/20">
                    <tr className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">Signal Alerts</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-300">Basic</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-green-400">All Types</td>
                    </tr>
                    <tr className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">Whale Activity</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-400">✓</td>
                    </tr>
                    <tr className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">Sell Wall Detection</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-400">✓</td>
                    </tr>
                    <tr className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">Advanced Analytics</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-400">✓</td>
                    </tr>
                    <tr className="hover:bg-purple-500/5">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">API Access</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">✗</td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-400">✓</td>
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

