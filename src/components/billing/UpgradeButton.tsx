'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface UpgradeButtonProps {
  planKey: string;
  label: string;
}

export default function UpgradeButton({ planKey, label }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planKey }),
      });

      const data = await response.json();

      if (data.paymentLink) {
        // Redirect to Flutterwave checkout
        window.location.href = data.paymentLink;
      } else {
        toast.error(data.error || 'Failed to initiate payment');
        setLoading(false);
      }
    } catch (error) {
      toast.error('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleUpgrade} 
      disabled={loading}
      className="btn-primary btn-sm btn"
    >
      {loading ? 'Processing...' : 'Upgrade'}
    </button>
  );
}