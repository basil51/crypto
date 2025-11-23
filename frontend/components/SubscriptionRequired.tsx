'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionRequiredProps {
  feature?: string;
}

export default function SubscriptionRequired({ feature = 'this feature' }: SubscriptionRequiredProps) {
  const { isPro } = useAuth();

  if (isPro) {
    return null; // User has subscription, don't show message
  }

  return (
    <div className="glass shadow-soft rounded-xl p-8 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-2xl font-bold mb-2">Premium Feature</h2>
      <p className="text-gray-600 mb-6">
        {feature} requires a Pro subscription to access.
      </p>
      <Link
        href="/billing"
        className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}

