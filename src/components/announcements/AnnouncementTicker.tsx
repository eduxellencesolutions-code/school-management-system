'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Megaphone, X } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  organization_id: string | null
}

const PUBLIC_PATHS = ['/login', '/signup', '/access', '/forgot-password', '/reset-password', '/']

export default function AnnouncementTicker() {
  const pathname = usePathname()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissedSession, setDismissedSession] = useState(false)
  const [loading, setLoading] = useState(true)
  const isPublicPath = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

  useEffect(() => {
    if (isPublicPath) {
      setLoading(false)
      return
    }

    // Delay slightly so this fetch doesn't race the main page navigation's
    // own auth/token-refresh check -- both hitting the server at the exact
    // same instant is what was causing intermittent
    // "refresh_token_already_used" errors. A short delay lets the page's
    // own request resolve (and refresh the token if needed) first.
    const timer = setTimeout(() => {
      fetch('/api/announcements/active')
        .then(r => (r.ok ? r.json() : { announcements: [] }))
        .then(data => setAnnouncements(data.announcements ?? []))
        .catch(() => setAnnouncements([]))
        .finally(() => setLoading(false))
    }, 800)

    return () => clearTimeout(timer)
  }, [isPublicPath])

  if (isPublicPath || loading || dismissedSession || announcements.length === 0) return null

  const combined = announcements
    .map(a => `${a.title} — ${a.body}`)
    .join('     •     ')

  return (
    <div className="sticky top-0 z-50 bg-brand-600 text-white overflow-hidden flex items-center h-9 w-full max-w-full">
      <div className="flex items-center gap-2 px-3 shrink-0 bg-brand-700 h-full z-10">
        <Megaphone size={14} />
      </div>
      <div className="flex-1 min-w-0 overflow-hidden whitespace-nowrap relative h-full flex items-center">
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