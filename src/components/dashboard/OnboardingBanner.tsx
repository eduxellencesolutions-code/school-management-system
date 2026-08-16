'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  percent: number
  completedSteps: number
  totalSteps: number
  accountType: 'institution' | 'solo_teacher'
}

export default function OnboardingBanner({ percent, completedSteps, totalSteps, accountType }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const supabase = createClient()

  async function handleDismiss() {
    setDismissed(true) // optimistic — don't make the user wait on the network to feel dismissed
    await supabase.rpc('dismiss_onboarding_guide')
  }

  if (dismissed) return null

  const label = accountType === 'solo_teacher' ? 'classroom' : 'school'

  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-blue-900">
          Welcome back! Your {label} setup is {percent}% complete.
        </p>
        <p className="text-xs text-blue-700 mt-0.5">
          {completedSteps} of {totalSteps} steps done — continue where you stopped.
        </p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/setup-guide"
          className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-md whitespace-nowrap"
        >
          Continue Setup →
        </Link>
        <button
          onClick={handleDismiss}
          className="text-xs text-blue-400 hover:text-blue-600"
          aria-label="Dismiss setup reminder"
        >
          ✕
        </button>
      </div>
    </div>
  )
}