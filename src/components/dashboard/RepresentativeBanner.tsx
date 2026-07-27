'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Handshake, X } from 'lucide-react'

const DISMISS_KEY = 'rep_banner_dismissed'

export default function RepresentativeBanner() {
  const [dismissed, setDismissed] = useState(true) // default hidden until we check localStorage, avoids flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true')
  }, [])

  if (dismissed) return null

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 mb-4 flex items-center gap-3">
      <Handshake size={18} className="text-brand-600 shrink-0" />
      <p className="text-sm text-brand-700 flex-1">
        Know a school or teacher who&apos;d love Eduxellence?{' '}
        <Link href="/representative-program" className="font-semibold hover:underline">
          Become a Representative and earn commission
        </Link>
      </p>
      <button
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, 'true')
          setDismissed(true)
        }}
        className="text-brand-400 hover:text-brand-700 shrink-0"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  )
}