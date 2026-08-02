'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Paperclip, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'technical_issue', label: 'Technical Issue' },
  { value: 'billing_subscription', label: 'Billing & Subscription' },
  { value: 'payment_issue', label: 'Payment Issue' },
  { value: 'login_problem', label: 'Login Problem' },
  { value: 'parent_portal', label: 'Parent Portal' },
  { value: 'report_card', label: 'Report Card' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'results_promotion', label: 'Results & Promotion' },
  { value: 'ai_remarks', label: 'AI Remarks' },
  { value: 'homework', label: 'Homework' },
  { value: 'fees', label: 'Fees' },
  { value: 'data_import', label: 'Data Import' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'bug_report', label: 'Bug Report' },
  { value: 'representative_programme', label: 'Representative Programme' },
  { value: 'general_enquiry', label: 'General Enquiry' },
]

const PRIORITIES = ['low', 'normal', 'high', 'critical']

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-amber-100 text-amber-800',
  waiting_customer: 'bg-purple-100 text-purple-800',
  escalated: 'bg-red-100 text-red-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-700',
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Open',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  waiting_customer: 'Waiting for Customer',
  escalated: 'Escalated',
  resolved: 'Resolved',
  closed: 'Closed',
}

interface Ticket {
  id: string
  subject: string
  category: string | null
  status: string
  priority: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  sender_user_id: string
  is_internal_note: boolean
  body: string
  created_at: string
}

export default function SupportCenter() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewForm, setShowNewForm] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function loadTickets() {
    setLoading(true)
    const res = await fetch('/api/support/my-tickets')
    const data = await res.json()
    setTickets(data.tickets ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTickets() }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Support</h1>
          <p className="page-subtitle">Get help with any issue — we typically respond within a business day.</p>
        </div>
        <button onClick={() => { setShowNewForm(true); setSelectedId(null) }} className="btn-primary btn flex items-center gap-1.5">
          <Plus size={15} /> New Ticket
        </button>
      </div>

      {showNewForm && (
        <NewTicketForm
          onCancel={() => setShowNewForm(false)}
          onCreated={(id) => { setShowNewForm(false); loadTickets(); setSelectedId(id) }}
        />
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="card-header"><h2 className="font-semibold text-sm text-ink">Your Tickets</h2></div>
          {loading ? (
            <div className="p-8 flex justify-center"><Loader2 className="animate-spin" size={18} /></div>
          ) : tickets.length === 0 ? (
            <p className="p-6 text-sm text-ink-muted text-center">No tickets yet.</p>
          ) : (
            <div className="divide-y divide-surface-100 max-h-[600px] overflow-y-auto">
              {tickets.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedId(t.id); setShowNewForm(false) }}
                  className={`w-full text-left p-3 text-sm transition-colors ${selectedId === t.id ? 'bg-brand-50' : 'hover:bg-surface-50'}`}
                >
                  <p className="font-medium text-ink">{t.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[t.status] ?? STATUS_STYLE.new}`}>
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <span className="text-xs text-ink-faint">{new Date(t.created_at).toLocaleDateString('en-NG')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selectedId ? (
            <TicketThread ticketId={selectedId} onLinkedTicketCreated={(id) => { loadTickets(); setSelectedId(id) }} />
          ) : !showNewForm ? (
            <div className="card p-12 text-center text-sm text-ink-muted">Select a ticket, or create a new one.</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function NewTicketForm({ onCancel, onCreated, linkedTicketId }: { onCancel: () => void; onCreated: (id: string) => void; linkedTicketId?: string }) {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general_enquiry')
  const [priority, setPriority] = useState('normal')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required')
      return
    }
    setSaving(true)
    const res = await fetch('/api/support/my-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, category, priority, description, linkedTicketId }),
    })
    const data = await res.json()
    setSaving(false)
    if (!data.success) {
      toast.error(data.error || 'Failed to create ticket')
      return
    }
    toast.success('Ticket created')
    onCreated(data.ticketId)
  }

  return (
    <div className="card p-5 flex flex-col gap-3">
      {linkedTicketId && (
        <p className="text-xs text-ink-muted bg-surface-50 border border-surface-200 rounded p-2">
          This ticket will be linked to your previous closed ticket so our team has full context.
        </p>
      )}
      <input
        type="text"
        placeholder="Subject"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        className="input"
      />
      <div className="flex gap-2 flex-wrap">
        <select value={category} onChange={e => setCategory(e.target.value)} className="input flex-1 min-w-[180px]">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="input w-32">
          {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p[0].toUpperCase() + p.slice(1)}</option>)}
        </select>
      </div>
      <textarea
        placeholder="Describe your issue in detail..."
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={5}
        className="input"
      />
      <p className="text-xs text-ink-faint flex items-center gap-1">
        <Paperclip size={12} /> File attachments aren't supported yet — describe the issue in as much detail as you can.
      </p>
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="btn-primary btn-sm btn">
          {saving ? 'Submitting...' : 'Submit Ticket'}
        </button>
        <button onClick={onCancel} className="btn-secondary btn-sm btn">Cancel</button>
      </div>
    </div>
  )
}

function TicketThread({ ticketId, onLinkedTicketCreated }: { ticketId: string; onLinkedTicketCreated: (id: string) => void }) {
  const [ticket, setTicket] = useState<any>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [showClosedPrompt, setShowClosedPrompt] = useState(false)
  const [showLinkedForm, setShowLinkedForm] = useState(false)

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/support/my-tickets/${ticketId}`)
    const data = await res.json()
    if (!data.error) {
      setTicket(data.ticket)
      setMessages(data.messages ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [ticketId])

  async function sendReply() {
    if (!reply.trim()) return
    setSending(true)
    const res = await fetch(`/api/support/my-tickets/${ticketId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: reply }),
    })
    const data = await res.json()
    setSending(false)

    if (data.ticketClosed) {
      setShowClosedPrompt(true)
      return
    }
    if (!data.success) {
      toast.error(data.error || 'Failed to send reply')
      return
    }
    setReply('')
    load()
  }

  if (loading) return <div className="card p-8 flex justify-center"><Loader2 className="animate-spin" size={18} /></div>
  if (!ticket) return <div className="card p-8 text-center text-sm text-ink-muted">Ticket not found.</div>

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-ink">{ticket.subject}</h3>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_STYLE[ticket.status] ?? STATUS_STYLE.new}`}>
          {STATUS_LABEL[ticket.status] ?? ticket.status}
        </span>
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {messages.map(m => (
          <div key={m.id} className="p-2.5 rounded bg-surface-50 text-sm">
            <p>{m.body}</p>
            <p className="text-xs text-ink-faint mt-1">{new Date(m.created_at).toLocaleString('en-NG')}</p>
          </div>
        ))}
      </div>

      {showClosedPrompt ? (
        <div className="border-t border-surface-100 pt-3 flex flex-col gap-2">
          <p className="text-sm text-ink-muted">
            This ticket is closed and can't receive new replies. Create a new ticket — we'll link it to this one for context.
          </p>
          {!showLinkedForm ? (
            <button onClick={() => setShowLinkedForm(true)} className="btn-primary btn-sm btn w-fit">
              Create New Ticket
            </button>
          ) : (
            <NewTicketForm
              linkedTicketId={ticketId}
              onCancel={() => setShowLinkedForm(false)}
              onCreated={onLinkedTicketCreated}
            />
          )}
        </div>
      ) : (
        <div className="border-t border-surface-100 pt-3 flex flex-col gap-2">
          <textarea
            placeholder="Reply..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={2}
            className="input"
          />
          <button onClick={sendReply} disabled={sending} className="btn-primary btn-sm btn w-fit">
            {sending ? 'Sending...' : 'Send Reply'}
          </button>
        </div>
      )}
    </div>
  )
}