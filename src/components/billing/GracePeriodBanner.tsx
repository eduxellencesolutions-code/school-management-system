'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

interface Props {
  daysRemaining: number
}

export default function GracePeriodBanner({ daysRemaining }: Props) {
  let tone: { bg: string; border: string; text: string; iconColor: string }
  let message: string

  if (daysRemaining <= 1) {
    tone = { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', iconColor: 'text-red-600' }
    message = 'Final reminder: Renew today to avoid losing editing access.'
  } else if (daysRemaining <= 3) {
    tone = { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', iconColor: 'text-orange-600' }
    message = `Only ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remain before your account becomes read-only.`
  } else {
    tone = { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-600' }
    message = `Your subscription has expired, but you're in a grace period. Renew within ${daysRemaining} days to continue editing and generating reports.`
  }

  return (
    <div className={`p-3 border rounded-lg flex items-center justify-between gap-3 flex-wrap ${tone.bg} ${tone.border}`}>
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className={`shrink-0 ${tone.iconColor}`} />
        <p className={`text-sm ${tone.text}`}>{message}</p>
      </div>
      <Link href="/settings?tab=billing" className="btn-primary btn-sm btn shrink-0">
        Renew Subscription
      </Link>
    </div>
  )
}
