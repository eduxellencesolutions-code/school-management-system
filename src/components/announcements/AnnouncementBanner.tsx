'use client'

import { useState, useEffect } from 'react'
import { Megaphone, X } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  organization_id: string | null
  created_at: string
  expires_at: string | null
}

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/announcements/active')
      .then(r => r.json())
      .then(data => setAnnouncements(data.announcements ?? []))
      .finally(() => setLoading(false))

    try {
      const stored = localStorage.getItem('dismissedAnnouncements')
      if (stored) setDismissed(new Set(JSON.parse(stored)))
    } catch {
      // ignore
    }
  }, [])

  function dismiss(id: string) {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    try {
      localStorage.setItem('dismissedAnnouncements', JSON.stringify([...next]))
    } catch {
      // ignore
    }
  }

  if (loading) return null

  const visible = announcements.filter(a => !dismissed.has(a.id))
  if (visible.length === 0) return null

  return (
    <div className="flex flex-col gap-2 mb-4">
      {visible.map(a => (
        <div
          key={a.id}
          className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 flex items-start gap-3"
        >
          <Megaphone size={16} className="text-brand-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink flex items-center gap-2 flex-wrap">
              {a.title}
              {a.organization_id === null && (
                <span className="text-[10px] font-medium text-white bg-brand-500 px-1.5 py-0.5 rounded">
                  Platform-wide
                </span>
              )}
            </p>
            <p className="text-sm text-ink-muted mt-0.5">{a.body}</p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
            className="text-ink-faint hover:text-ink shrink-0"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  )
}