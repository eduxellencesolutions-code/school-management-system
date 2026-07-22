'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassOption {
  id: string
  name: string
}

interface Learner {
  id: string
  first_name: string
  last_name: string
  admission_number: string | null
}

type Status = 'present' | 'absent' | 'late'

interface Props {
  classes: ClassOption[]
  termId: string
  sessionId: string
}

export default function AttendanceSheet({ classes, termId, sessionId }: Props) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState(classes[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [learners, setLearners] = useState<Learner[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!groupId) return
    setLoading(true)
    setSaved(false)
    setError(null)

    supabase
      .from('learners')
      .select('id, first_name, last_name, admission_number')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('last_name')
      .then(({ data, error: fetchError }) => {
        if (fetchError) {
          setError('Could not load students for this class.')
          setLearners([])
        } else {
          setLearners(data ?? [])
          const initial: Record<string, Status> = {}
          ;(data ?? []).forEach((l) => {
            initial[l.id] = 'present'
          })
          setStatuses(initial)
        }
        setLoading(false)
      })
  }, [groupId])

  function setStatus(learnerId: string, status: Status) {
    setStatuses((prev) => ({ ...prev, [learnerId]: status }))
  }

  function markAllPresent() {
    const next: Record<string, Status> = {}
    learners.forEach((l) => (next[l.id] = 'present'))
    setStatuses(next)
  }

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)

    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        groupId,
        termId,
        sessionId,
        date,
        records: learners.map((l) => ({ learnerId: l.id, status: statuses[l.id] })),
      }),
    })

    const data = await res.json()
    if (data.success) {
      setSaved(true)
    } else {
      setError(data.error ?? 'Failed to save attendance.')
    }
    setSaving(false)
  }

  return (
    <div className="card">
      <div className="card-header flex items-center gap-4 flex-wrap">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="border border-surface-200 rounded px-2 py-1.5 text-sm"
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-surface-200 rounded px-2 py-1.5 text-sm"
        />
        <button onClick={markAllPresent} className="btn-secondary btn-sm btn ml-auto">
          Mark all present
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Loading students...
        </div>
      ) : learners.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-muted">No students in this class.</div>
      ) : (
        <div className="divide-y divide-surface-100">
          {learners.map((l) => (
            <div key={l.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{l.last_name} {l.first_name}</p>
                {l.admission_number && (
                  <p className="text-xs text-ink-faint font-mono">{l.admission_number}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setStatus(l.id, 'present')}
                  className={`btn-sm btn flex items-center gap-1 ${
                    statuses[l.id] === 'present' ? 'bg-green-100 text-green-700' : 'btn-secondary'
                  }`}
                >
                  <CheckCircle2 size={13} /> Present
                </button>
                <button
                  onClick={() => setStatus(l.id, 'late')}
                  className={`btn-sm btn flex items-center gap-1 ${
                    statuses[l.id] === 'late' ? 'bg-amber-100 text-amber-700' : 'btn-secondary'
                  }`}
                >
                  <Clock size={13} /> Late
                </button>
                <button
                  onClick={() => setStatus(l.id, 'absent')}
                  className={`btn-sm btn flex items-center gap-1 ${
                    statuses[l.id] === 'absent' ? 'bg-red-100 text-red-700' : 'btn-secondary'
                  }`}
                >
                  <XCircle size={13} /> Absent
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 border-t border-surface-100 flex items-center justify-between">
        {error && <p className="text-xs text-red-600">{error}</p>}
        {saved && <p className="text-xs text-green-600">Attendance saved.</p>}
        <button
          onClick={save}
          disabled={saving || learners.length === 0}
          className="btn-primary btn ml-auto"
        >
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  )
}
