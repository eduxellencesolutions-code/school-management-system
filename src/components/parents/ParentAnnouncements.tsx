'use client'

import { useState, useEffect } from 'react'
import { Loader2, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  created_at: string
}

export default function ParentAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parents/announcements')
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-center text-xs text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Loading announcements...
      </div>
    )
  }

  if (announcements.length === 0) return null

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone size={15} className="text-brand-500" />
        <h2 className="font-semibold text-sm text-ink">School Announcements</h2>
      </div>
      <div className="flex flex-col gap-3">
        {announcements.map((a) => (
          <div key={a.id} className="border-l-2 border-brand-200 pl-3">
            <p className="text-sm font-medium text-ink">{a.title}</p>
            <p className="text-xs text-ink-muted mt-0.5">{a.body}</p>
            <p className="text-[10px] text-ink-faint mt-1">
              {new Date(a.created_at).toLocaleDateString('en-NG')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}