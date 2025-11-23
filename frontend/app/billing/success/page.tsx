'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function BillingSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait a moment for Stripe webhook to process
    setTimeout(() => {
      setLoading(false);
      // Refresh user data to get updated subscription status
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, 2000);
  }, []);

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="glass shadow-soft rounded-xl p-8 text-center">
              {loading ? (
                <>
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <h1 className="text-2xl font-bold mb-2">Processing your subscription...</h1>
                  <p className="text-gray-600">Please wait while we activate your Pro plan.</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">✅</div>
                  <h1 className="text-3xl font-bold mb-2 text-green-600">Subscription Activated!</h1>
                  <p className="text-gray-600 mb-6">
                    Your Pro subscription has been successfully activated. You now have access to all premium features.
                  </p>
                  <div className="flex gap-4 justify-center">
                    <Link
                      href="/"
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
                    >
                      Go to Dashboard
                    </Link>
                    <Link
                      href="/billing"
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Manage Subscription
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <div className="min-h-screen">
          <Navbar />
          <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
            <div className="px-4 py-6 sm:px-0">
              <div className="glass shadow-soft rounded-xl p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                <h1 className="text-2xl font-bold mb-2">Loading...</h1>
              </div>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    }>
      <BillingSuccessContent />
    </Suspense>
  );
}

