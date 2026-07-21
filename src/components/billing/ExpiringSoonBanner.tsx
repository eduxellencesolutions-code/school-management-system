'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Props {
  daysUntilExpiry: number
}

export default function ExpiringSoonBanner({ daysUntilExpiry }: Props) {
  const urgencyColor = daysUntilExpiry <= 1 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'
  const urgencyIcon = daysUntilExpiry <= 1 ? 'text-red-600' : 'text-amber-600'
  
  return (
    <div className={`p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap ${urgencyColor}`}>
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className={`shrink-0 ${urgencyIcon}`} />
        <p className="text-sm">
          {daysUntilExpiry === 0 
            ? 'Your subscription renews today' 
            : `Your subscription renews in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}`}
        </p>
      </div>
      <Link href="/settings#billing" className="btn-primary btn-sm btn shrink-0">
        Renew Now
      </Link>
    </div>
  )
}
