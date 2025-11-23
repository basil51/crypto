'use client';

import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';

export default function BillingCancelPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto pt-24 pb-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="glass shadow-soft rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">😔</div>
              <h1 className="text-3xl font-bold mb-2">Subscription Cancelled</h1>
              <p className="text-gray-600 mb-6">
                Your subscription checkout was cancelled. No charges were made.
              </p>
              <div className="flex gap-4 justify-center">
                <Link
                  href="/billing"
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
                >
                  Try Again
                </Link>
                <Link
                  href="/"
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

