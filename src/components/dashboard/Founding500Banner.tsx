// src/components/dashboard/Founding500Banner.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Founding500Banner() {
  const [status, setStatus] = useState<any>(null)
  useEffect(() => {
    fetch('/api/founding-500/status').then(r => r.json()).then(setStatus).catch(() => {})
  }, [])
  if (!status?.eligible) return null
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="font-semibold text-amber-900">🏆 You're eligible for Founding 500</p>
        <p className="text-sm text-amber-700">Activate your first-term Founding 500 offer for ₦2,000.</p>
      </div>
      <Link href="/founding-500/enroll" className="bg-amber-600 text-white text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap">
        Activate Founding 500
      </Link>
    </div>
  )
}