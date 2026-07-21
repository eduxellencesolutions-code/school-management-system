'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Props {
  daysUntilExpiry: number
}

export default function ExpiringSoonBanner({ daysUntilExpiry }: Props) {
  const message = daysUntilExpiry === 0
    ? 'Your subscription renews today. Pay now to avoid any interruption.'
    : `Your subscription renews in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}. Renew early to avoid any interruption.`

  return (
    <div className="p-3 border border-amber-200 rounded-lg bg-amber-50 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">{message}</p>
      </div>
      <Link href="/settings?tab=billing" className="btn-primary btn-sm btn shrink-0">
        Renew Now
      </Link>
    </div>
  )
}
