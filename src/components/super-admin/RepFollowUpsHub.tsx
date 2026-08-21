// src/components/super-admin/RepFollowUpsHub.tsx
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import RepresentativeSummaryPicker from './RepresentativeSummaryPicker'

export default function RepFollowUpsHub() {
  const [summaries, setSummaries] = useState<any[]>([])
  const [summariesLoading, setSummariesLoading] = useState(true)
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'due' | 'overdue'>('all')

  useEffect(() => {
    fetch('/api/platform-staff/representatives/management-summary')
      .then(r => r.json()).then(d => setSummaries(d.summaries ?? [])).finally(() => setSummariesLoading(false))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedRepId) params.set('representativeId', selectedRepId)
    if (filter === 'due') params.set('due', 'true')
    if (filter === 'overdue') params.set('overdue', 'true')
    fetch(`/api/platform-staff/follow-ups?${params}`)
      .then(r => r.json()).then(d => setFollowUps(d.followUps ?? [])).finally(() => setLoading(false))
  }, [selectedRepId, filter])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Representative Follow-ups</h1>
        <p className="text-sm text-ink-muted mt-1">Select a representative to see their activity, or view all.</p>
      </div>

      <RepresentativeSummaryPicker
        summaries={summaries} loading={summariesLoading} selectedRepId={selectedRepId}
        onSelect={setSelectedRepId} countKey="followups_count" overdueKey="followups_overdue"
      />

      <div className="flex gap-2">
        {(['all', 'due', 'overdue'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`text-xs px-3 py-1.5 rounded-full border ${filter === f ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}>
            {f === 'all' ? 'All' : f === 'due' ? 'Due This Week' : 'Overdue'}
          </button>
        ))}
      </div>

      <div className="card p-5">
        {loading ? <div className="flex justify-center p-4"><Loader2 className="animate-spin" size={16} /></div> : followUps.length === 0 ? (
          <p className="text-xs text-ink-faint">No follow-ups match this view.</p>
        ) : (
          <div className="divide-y divide-surface-100">
            {followUps.map((f: any) => (
              <div key={f.id} className="py-3 text-sm">
                <p className="font-medium text-ink">
                  {f.organizations?.name} <span className="text-ink-faint font-normal">— {new Date(f.contact_date).toLocaleDateString('en-NG')} · {f.contact_method.replace('_', ' ')} · by {f.representatives?.full_name}</span>
                </p>
                {f.school_reported && <p className="text-ink-muted mt-1">{f.school_reported}</p>}
                {f.follow_up_required && f.next_follow_up_date && (
                  <p className="text-xs text-brand-600 mt-1">Next: {new Date(f.next_follow_up_date).toLocaleDateString('en-NG')}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}