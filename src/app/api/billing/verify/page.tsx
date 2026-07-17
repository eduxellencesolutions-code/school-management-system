'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();

  useEffect(() => {
    // Wait a few seconds then redirect to dashboard
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Loader2 size={40} className="animate-spin text-brand-500 mb-4" />
      <h2 className="text-xl font-semibold text-ink">Confirming your payment...</h2>
      <p className="text-ink-muted mt-2">
        This will just take a moment. Your dashboard will update automatically.
      </p>
    </div>
  );
}