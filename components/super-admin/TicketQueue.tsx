'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function TicketQueue() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [reply, setReply] = useState('')
  const [isInternal, setIsInternal] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/support/tickets?scope=all')
    const data = await res.json()
    setTickets(data.tickets ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openTicket(t: any) {
    setSelected(t)
    const res = await fetch(`/api/support/tickets/${t.id}`)
    const data = await res.json()
    setMessages(data.messages ?? [])
  }

  async function updateStatus(status: string) {
    await fetch(`/api/support/tickets/${selected.id}/status`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
    setSelected({ ...selected, status })
  }

  async function sendReply() {
    if (!reply) return
    await fetch(`/api/support/tickets/${selected.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply, isInternalNote: isInternal }),
    })
    setReply('')
    openTicket(selected)
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card divide-y divide-surface-100">
        {tickets.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No tickets.</p> : tickets.map(t => (
          <button key={t.id} onClick={() => openTicket(t)} className={`w-full text-left p-3 text-sm ${selected?.id === t.id ? 'bg-brand-50' : 'hover:bg-surface-50'}`}>
            <p className="font-medium text-ink">{t.subject}</p>
            <p className="text-xs text-ink-faint">{t.submitterName ?? t.submitterEmail} · {t.status} · {t.priority}</p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-2 card p-4">
        {!selected ? <p className="text-sm text-ink-muted text-center p-8">Select a ticket</p> : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{selected.subject}</h3>
              <select value={selected.status} onChange={e => updateStatus(e.target.value)} className="border rounded px-2 py-1 text-xs">
                {['new','assigned','in_progress','waiting_customer','escalated','resolved','closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
              {messages.map(m => (
                <div key={m.id} className={`p-2 rounded text-sm ${m.is_internal_note ? 'bg-amber-50' : 'bg-surface-50'}`}>
                  <p className="text-xs font-medium text-ink-muted">{m.senderName}{m.is_internal_note && ' (internal note)'}</p>
                  <p>{m.body}</p>
                </div>
              ))}
            </div>
            <textarea placeholder="Reply..." value={reply} onChange={e => setReply(e.target.value)} className="border rounded px-3 py-2 text-sm" rows={2} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} /> Internal note (not visible to customer)
            </label>
            <button onClick={sendReply} className="btn-primary btn-sm btn w-fit">Send</button>
          </div>
        )}
      </div>
    </div>
  )
}