// src/components/super-admin/FoundingInstitutionsQueue.tsx
'use client'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function FoundingInstitutionsQueue() {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [placesRemaining, setPlacesRemaining] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff/founding-institutions')
    const data = await res.json()
    setApps(data.applications ?? [])
    setPlacesRemaining(data.placesRemaining ?? null)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function act(id: string, action: 'start_review' | 'qualify' | 'reject') {
    const reason = (action === 'reject' || action === 'qualify') ? prompt(
      action === 'reject' ? 'Reason for rejection (required)?' : 'Review notes (optional)?'
    ) : null
    if (action === 'reject' && !reason) return

    const res = await fetch(`/api/platform-staff/founding-institutions/${id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reason }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    load()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {placesRemaining !== null && (
        <p className="text-sm text-ink-muted">{placesRemaining} founding place{placesRemaining === 1 ? '' : 's'} remaining</p>
      )}
      <div className="card divide-y divide-surface-100">
        {apps.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No applications.</p> : apps.map(a => (
          <div key={a.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{a.institution_name} · {a.contact_name} ({a.contact_email})</p>
              <p className="text-xs text-ink-faint">
                {a.status} · {new Date(a.created_at).toLocaleDateString('en-NG')}
                {a.status_reason && ` · ${a.status_reason}`}
              </p>
            </div>
            <div className="flex gap-2">
              {a.status === 'applied' && (
                <button onClick={() => act(a.id, 'start_review')} className="btn-sm btn bg-blue-50 text-blue-600">Start Review</button>
              )}
              {a.status === 'under_review' && (
                <>
                  <button onClick={() => act(a.id, 'qualify')} className="btn-sm btn bg-green-50 text-green-600">Qualify</button>
                  <button onClick={() => act(a.id, 'reject')} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}