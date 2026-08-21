// src/components/super-admin/RepEscalationsHub.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import RepresentativeSummaryPicker from './RepresentativeSummaryPicker'

const PRIORITY_STYLE: Record<string, string> = {
  critical: '🔴 bg-red-100 text-red-800', high: '🟠 bg-orange-100 text-orange-800',
  normal: '🟡 bg-amber-100 text-amber-800', low: '🟢 bg-gray-100 text-gray-700',
}

export default function RepEscalationsHub() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [summariesLoading, setSummariesLoading] = useState(true)
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState('')
  const [escalations, setEscalations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-staff/representatives/management-summary')
      .then(r => r.json()).then(d => setSummaries(d.summaries ?? [])).finally(() => setSummariesLoading(false))
  }, [])

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedRepId) params.set('representativeId', selectedRepId)
    if (priority) params.set('priority', priority)
    if (status) params.set('status', status)
    fetch(`/api/platform-staff/escalations?${params}`)
      .then(r => r.json()).then(d => setEscalations(d.escalations ?? [])).finally(() => setLoading(false))
  }
  useEffect(load, [selectedRepId, priority, status])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Escalations</h1>
        <p className="text-sm text-ink-muted mt-1">Issues representatives couldn't resolve on their own.</p>
      </div>

      <RepresentativeSummaryPicker summaries={summaries} loading={summariesLoading} selectedRepId={selectedRepId} onSelect={setSelectedRepId} countKey="open_escalations" />

      <div className="flex gap-2">
        <select className="input w-fit" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="critical">Critical</option><option value="high">High</option>
          <option value="normal">Normal</option><option value="low">Low</option>
        </select>
        <select className="input w-fit" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="new">New</option><option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option><option value="waiting_customer">Waiting on School</option>
          <option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
      </div>

      <div className="card p-5">
        {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" size={16} /></div> : escalations.length === 0 ? (
          <p className="text-xs text-ink-faint">No escalations match this view.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {escalations.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-ink">{t.subject} <span className="text-ink-faint font-normal">— {t.organizations?.name}</span></p>
                  <p className="text-xs text-ink-faint">{new Date(t.created_at).toLocaleDateString('en-NG')} · by {t.representatives?.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${(PRIORITY_STYLE[t.priority] ?? '').split(' ').slice(1).join(' ')}`}>
                    {(PRIORITY_STYLE[t.priority] ?? '').split(' ')[0]} {t.priority}
                  </span>
                  <span className="badge text-[10px] badge-gray">{t.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}