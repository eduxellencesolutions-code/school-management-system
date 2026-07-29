'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function SubmitTicket() {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('normal')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!subject || !message) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, message, priority }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess(true)
      setSubject(''); setMessage('')
    } else {
      setError(data.error ?? 'Failed to submit ticket.')
    }
    setSaving(false)
  }

  return (
    <div className="card p-5 flex flex-col gap-3 max-w-md">
      <h3 className="text-sm font-semibold text-ink">Contact Support</h3>
      {success && <p className="text-xs text-green-600">Ticket submitted — we'll respond soon.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input type="text" placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="border rounded px-3 py-2 text-sm" />
      <textarea placeholder="Describe your issue..." rows={4} value={message} onChange={e => setMessage(e.target.value)} className="border rounded px-3 py-2 text-sm resize-none" />
      <select value={priority} onChange={e => setPriority(e.target.value)} className="border rounded px-3 py-2 text-sm">
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
      <button onClick={submit} disabled={saving} className="btn-primary btn-sm btn w-fit">
        {saving ? <Loader2 size={14} className="animate-spin" /> : 'Submit Ticket'}
      </button>
    </div>
  )
}