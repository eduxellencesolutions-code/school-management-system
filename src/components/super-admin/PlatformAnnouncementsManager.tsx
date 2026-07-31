'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Trash2, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  audience: string
  expires_at: string | null
  created_at: string
}

export default function PlatformAnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-announcements')
    const data = await res.json()
    if (data.error) setError(data.error)
    else setAnnouncements(data.announcements ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!title || !message) return
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/platform-announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, message, audience, expiresAt: expiresAt || null }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (data.success) {
      setTitle(''); setMessage(''); setAudience('all'); setExpiresAt(''); setShowForm(false)
      load()
    } else {
      setError(data.error)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement? This cannot be undone.')) return
    setDeletingId(id)
    const res = await fetch(`/api/platform-announcements/${id}`, { method: 'DELETE' })
    const data = await res.json()
    setDeletingId(null)
    if (data.success) load()
    else setError(data.error)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="card p-4 text-sm text-red-600 bg-red-50">{error}</div>}

      <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm btn w-fit flex items-center gap-1.5">
        <Plus size={14} /> New Announcement
      </button>

      {showForm && (
        <div className="card p-5 flex flex-col gap-3 max-w-lg">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-3">
            {/* ✅ Updated audience dropdown */}
            <select 
              value={audience} 
              onChange={e => setAudience(e.target.value)} 
              className="border rounded px-3 py-2 text-sm flex-1"
            >
              <option value="all">Everyone</option>
              <option value="subscribers">Subscribers only (schools & solo teachers)</option>
              <option value="representatives">Representatives only</option>
              <option value="platform_staff">Platform staff only</option>
              <option value="parents">Parents only</option>
            </select>
            <input
              type="date"
              value={expiresAt}
              onChange={e => setExpiresAt(e.target.value)}
              className="border rounded px-3 py-2 text-sm flex-1"
              title="Expires on (optional)"
            />
          </div>
          <button onClick={submit} disabled={submitting} className="btn-primary btn-sm btn w-fit disabled:opacity-50">
            {submitting ? 'Posting...' : 'Post Announcement'}
          </button>
        </div>
      )}

      <div className="card divide-y divide-surface-100">
        {announcements.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted text-center">No platform announcements yet.</p>
        ) : announcements.map(a => (
          <div key={a.id} className="p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Megaphone size={14} className="text-brand-500" />
                <p className="text-sm font-medium text-ink">{a.title}</p>
              </div>
              <p className="text-sm text-ink-muted whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-ink-faint mt-1.5">
                Audience: {a.audience} · Posted {new Date(a.created_at).toLocaleDateString('en-NG')}
                {a.expires_at ? ` · Expires ${new Date(a.expires_at).toLocaleDateString('en-NG')}` : ''}
              </p>
            </div>
            <button
              onClick={() => remove(a.id)}
              disabled={deletingId === a.id}
              className="btn-sm btn bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1 disabled:opacity-50 shrink-0"
            >
              <Trash2 size={13} /> {deletingId === a.id ? '...' : 'Delete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}