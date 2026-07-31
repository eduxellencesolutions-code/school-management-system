'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  organization_id: string | null
}

export default function AnnouncementTicker() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedSession, setDismissedSession] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/announcements/active')
      .then(r => (r.ok ? r.json() : { announcements: [] }))
      .then(data => setAnnouncements(data.announcements ?? []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || dismissedSession || announcements.length === 0) return null

  const combined = announcements
    .map(a => `${a.title} — ${a.body}`)
    .join('     •     ')

  return (
    <div className="sticky top-0 z-50 bg-brand-600 text-white overflow-hidden flex items-center h-9">
      <div className="flex items-center gap-2 px-3 shrink-0 bg-brand-700 h-full z-10">
        <Megaphone size={14} />
      </div>
      <div className="flex-1 overflow-hidden whitespace-nowrap relative h-full flex items-center">
        <div className="inline-block animate-[ticker_30s_linear_infinite] whitespace-nowrap text-sm font-medium px-4">
          {combined}
          <span className="px-8">•</span>
          {combined}
        </div>
      </div>
      <button
        onClick={() => setDismissedSession(true)}
        className="shrink-0 px-3 h-full flex items-center hover:bg-brand-700 transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}