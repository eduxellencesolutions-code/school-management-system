'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function ExpiredBanner() {
  return (
    <div className="p-3 border border-red-200 rounded-lg bg-red-50 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="shrink-0 text-red-600" />
        <p className="text-sm text-red-800">
          Your subscription has expired. Renew now to regain full access to editing and report generation.
        </p>
      </div>
      <Link href="/settings?tab=billing" className="btn-primary btn-sm bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700 text-white shrink-0">
        Renew Subscription
      </Link>
    </div>
  )
}
