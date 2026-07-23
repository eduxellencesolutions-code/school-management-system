'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClassOption { id: string; name: string }
interface Learner { id: string; first_name: string; last_name: string }

interface FeeState {
  totalExpected: string
  totalPaid: string
  dueDate: string
  saved: boolean
  saving: boolean
}

export default function FeesManager({ classes, termId }: { classes: ClassOption[]; termId: string | null }) {
  const supabase = createClient()
  const [groupId, setGroupId] = useState(classes[0]?.id ?? '')
  const [learners, setLearners] = useState<Learner[]>([])
  const [fees, setFees] = useState<Record<string, FeeState>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!groupId || !termId) return
    setLoading(true)
    setError(null)

    supabase
      .from('learners')
      .select('id, first_name, last_name')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('last_name')
      .then(async ({ data: learnerData, error: learnerError }) => {
        if (learnerError || !learnerData) {
          setError('Could not load students for this class.')
          setLoading(false)
          return
        }
        setLearners(learnerData)

        const initial: Record<string, FeeState> = {}
        await Promise.all(
          learnerData.map(async (l) => {
            const res = await fetch(`/api/fees?learnerId=${l.id}&termId=${termId}`)
            const data = await res.json()
            initial[l.id] = {
              totalExpected: data.fee?.total_expected != null ? String(data.fee.total_expected) : '',
              totalPaid: data.fee?.total_paid != null ? String(data.fee.total_paid) : '',
              dueDate: data.fee?.due_date ?? '',
              saved: false,
              saving: false,
            }
          })
        )
        setFees(initial)
        setLoading(false)
      })
  }, [groupId, termId])

  function updateField(learnerId: string, field: 'totalExpected' | 'totalPaid' | 'dueDate', value: string) {
    setFees((prev) => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], [field]: value, saved: false },
    }))
  }

  async function saveFee(learnerId: string) {
    if (!termId) return
    const fee = fees[learnerId];
    if (!fee) return;

    setFees((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], saving: true } }))
    setError(null)

    const res = await fetch('/api/fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        termId,
        totalExpected: Number(fee.totalExpected) || 0,
        totalPaid: Number(fee.totalPaid) || 0,
        dueDate: fee.dueDate || null,
      }),
    })

    const data = await res.json()
    if (data.success) {
      setFees((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], saving: false, saved: true } }))
      setTimeout(() => {
        setFees((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], saved: false } }))
      }, 2000)
    } else {
      setError(data.error ?? `Failed to save fee for this student.`)
      setFees((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], saving: false } }))
    }
  }

  if (!termId) {
    return (
      <div className="card p-8 text-center text-sm text-ink-muted">
        No current academic term is set. Please set your current term in Settings first.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5 flex items-center gap-4">
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="border border-surface-200 rounded px-2 py-1.5 text-sm"
        >
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading...
          </div>
        ) : learners.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">No students in this class.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Student</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Expected (₦)</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Paid (₦)</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Outstanding (₦)</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Due Date</th>
                  <th className="text-center px-4 py-2 text-xs font-semibold text-ink-muted uppercase tracking-wider">Save</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l) => {
                  const fee = fees[l.id] ?? { totalExpected: '', totalPaid: '', dueDate: '', saved: false, saving: false }
                  const outstanding = (Number(fee.totalExpected) || 0) - (Number(fee.totalPaid) || 0)
                  return (
                    <tr key={l.id} className="border-b border-surface-100">
                      <td className="px-4 py-2 font-medium text-ink">{l.last_name} {l.first_name}</td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={fee.totalExpected}
                          onChange={(e) => updateField(l.id, 'totalExpected', e.target.value)}
                          className="w-24 border border-surface-200 rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={fee.totalPaid}
                          onChange={(e) => updateField(l.id, 'totalPaid', e.target.value)}
                          className="w-24 border border-surface-200 rounded px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {outstanding.toLocaleString('en-NG')}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="date"
                          value={fee.dueDate}
                          onChange={(e) => updateField(l.id, 'dueDate', e.target.value)}
                          className="border border-surface-200 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => saveFee(l.id)}
                          disabled={fee.saving}
                          className="btn-secondary btn-sm btn flex items-center gap-1 mx-auto"
                        >
                          <Save size={12} />
                          {fee.saving ? '...' : fee.saved ? 'Saved' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}