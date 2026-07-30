'use client'

import { useState, useEffect } from 'react'
import { Loader2, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  created_at: string
  expires_at: string | null // ✅ NEW
  audience: string // ✅ NEW
  organization_id: string | null // ✅ NEW
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

  // ✅ Check if there are any platform-wide announcements
  const hasPlatformWide = announcements.some(a => a.organization_id === null)

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone size={15} className="text-brand-500" />
        <h2 className="font-semibold text-sm text-ink">
          {hasPlatformWide ? 'Announcements' : 'School Announcements'}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {announcements.map((a) => (
          <div key={a.id} className="border-l-2 border-brand-200 pl-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-ink">{a.title}</p>
              {/* ✅ NEW: Platform-wide badge */}
              {a.organization_id === null && (
                <span className="text-[10px] font-medium text-white bg-brand-500 px-1.5 py-0.5 rounded">
                  📢 Platform-wide
                </span>
              )}
            </div>
            <p className="text-xs text-ink-muted mt-0.5">{a.body}</p>
            <p className="text-[10px] text-ink-faint mt-1">
              {new Date(a.created_at).toLocaleDateString('en-NG')}
              {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString('en-NG')}`}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}