// src/components/super-admin/RepFeedbackHub.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import RepresentativeSummaryPicker from './RepresentativeSummaryPicker'

const CATEGORIES = [
  { value: '', label: 'All Categories' }, { value: 'product', label: 'Product' },
  { value: 'customer', label: 'Customer' }, { value: 'operational', label: 'Operational' },
]

export default function RepFeedbackHub() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [summariesLoading, setSummariesLoading] = useState(true)
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [feedback, setFeedback] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/platform-staff/representatives/management-summary')
      .then(r => r.json()).then(d => setSummaries(d.summaries ?? [])).finally(() => setSummariesLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedRepId) params.set('representativeId', selectedRepId)
    if (category) params.set('category', category)
    fetch(`/api/platform-staff/feedback?${params}`)
      .then(r => r.json()).then(d => setFeedback(d.feedback ?? [])).finally(() => setLoading(false))
  }, [selectedRepId, category])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Feedback</h1>
        <p className="text-sm text-ink-muted mt-1">Field intelligence submitted by representatives on behalf of their schools.</p>
      </div>

      <RepresentativeSummaryPicker summaries={summaries} loading={summariesLoading} selectedRepId={selectedRepId} onSelect={setSelectedRepId} countKey="feedback_count" />

      <select className="input w-fit" value={category} onChange={e => setCategory(e.target.value)}>
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <div className="card p-5">
        {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" size={16} /></div> : feedback.length === 0 ? (
          <p className="text-xs text-ink-faint">No feedback matches this view.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {feedback.map((f: any) => (
              <div key={f.id} className="py-3 text-sm">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-100 text-ink-muted mr-2">{f.category}</span>
                <span className="font-medium text-ink">{f.organizations?.name}</span>
                <span className="text-ink-faint text-xs"> · by {f.representatives?.full_name} · {new Date(f.created_at).toLocaleDateString('en-NG')}</span>
                <p className="text-ink-muted text-xs mt-0.5">{(f.subtype ?? f.satisfaction ?? '').replace(/_/g, ' ')}</p>
                {f.biggest_challenge && <p className="text-ink-faint text-xs">{f.biggest_challenge}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}