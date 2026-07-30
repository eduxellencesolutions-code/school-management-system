'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  audience: string
  created_at: string
  expires_at: string | null
  organization_id: string | null // ✅ NEW
}

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState('all')
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [isPlatformWide, setIsPlatformWide] = useState(false) // ✅ NEW

  async function load() {
    setLoading(true)
    const res = await fetch('/api/admin/announcements')
    const data = await res.json()
    if (data.error) setError(data.error)
    else setAnnouncements(data.announcements ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function create() {
    if (!title || !content) return
    setSaving(true)
    setError(null)

    const res = await fetch('/api/admin/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        title, 
        body: content, 
        audience, 
        expiresAt: expiresAt || null,
        isPlatformWide, // ✅ NEW
      }),
    })
    const data = await res.json()
    if (data.success) {
      setTitle(''); setContent(''); setExpiresAt(''); setShowForm(false)
      setIsPlatformWide(false) // ✅ NEW
      load()
    } else {
      setError(data.error ?? 'Failed to post announcement.')
    }
    setSaving(false)
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return
    const res = await fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) load()
    else setError(data.error ?? 'Failed to delete.')
  }

  return (
    <div className="flex flex-col gap-4">
      <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm btn flex items-center gap-1.5 w-fit">
        <Plus size={14} /> New Announcement
      </button>

      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      {showForm && (
        <div className="card p-5 flex flex-col gap-3 max-w-lg">
          <input
            type="text" placeholder="Title" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border border-surface-200 rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Message" value={content} rows={4}
            onChange={(e) => setContent(e.target.value)}
            className="border border-surface-200 rounded px-3 py-2 text-sm resize-none"
          />
          <div className="flex gap-3">
            <select value={audience} onChange={(e) => setAudience(e.target.value)}
              className="border border-surface-200 rounded px-3 py-2 text-sm">
              <option value="all">Everyone</option>
              <option value="parents">Parents only</option>
              <option value="staff">Staff only</option>
            </select>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="border border-surface-200 rounded px-3 py-2 text-sm" placeholder="Expires (optional)" />
          </div>
          {/* ✅ NEW: Platform-wide checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPlatformWide"
              checked={isPlatformWide}
              onChange={(e) => setIsPlatformWide(e.target.checked)}
              className="rounded border-surface-300 text-brand-500 focus:ring-brand-500"
            />
            <label htmlFor="isPlatformWide" className="text-sm text-ink">
              Platform-wide announcement (visible to all schools)
            </label>
          </div>
          <button onClick={create} disabled={saving} className="btn-primary btn-sm btn w-fit">
            {saving ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">No announcements yet.</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {announcements.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{a.title}</p>
                  <p className="text-xs text-ink-muted mt-1">{a.body}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-ink-faint">
                      {a.audience} · {new Date(a.created_at).toLocaleDateString('en-NG')}
                      {a.expires_at && ` · Expires ${new Date(a.expires_at).toLocaleDateString('en-NG')}`}
                    </span>
                    {/* ✅ NEW: Show platform-wide badge */}
                    {a.organization_id === null && (
                      <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                        Platform-wide
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(a.id)} className="text-ink-faint hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}