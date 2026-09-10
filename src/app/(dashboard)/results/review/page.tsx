// FILE: src/app/(dashboard)/results/review/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface QueueItem {
  submission_id: string; subject_id: string; subject_name: string; subject_code: string | null
  cohort_name: string; department_name: string | null; faculty_name: string | null
  credit_unit: number | null; student_count: number; status: string
  submitted_at: string; lecturer_name: string | null; action: 'review' | 'publish'
}

const statusLabel: Record<string, string> = {
  lecturer_submitted: 'Awaiting department review',
  pending_faculty: 'Awaiting faculty review',
  pending_registry: 'Awaiting registry review',
  pending_senate: 'Awaiting Senate approval',
  senate_approved: 'Senate approved — ready to publish',
}

export default function ReviewQueuePage() {
  const supabase = createClient()
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [returnReason, setReturnReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function loadQueue() {
    const { data } = await supabase.rpc('get_my_review_queue')
    setQueue(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadQueue() }, [])

  async function toggleExpand(item: QueueItem) {
    if (expanded === item.submission_id) { setExpanded(null); setDetail(null); return }
    setExpanded(item.submission_id)
    const { data } = await supabase.rpc('get_submission_score_detail', { p_submission_id: item.submission_id })
    setDetail(data)
  }

  async function handleApprove(submissionId: string) {
    setBusy(true)
    const { error } = await supabase.rpc('advance_result_stage', { p_submission_id: submissionId, p_action: 'approve' })
    setBusy(false)
    if (error) { alert(error.message); return }
    setExpanded(null)
    loadQueue()
  }

  async function handleReturn(submissionId: string) {
    if (!returnReason.trim()) { alert('A reason is required to return a result.'); return }
    setBusy(true)
    const { error } = await supabase.rpc('advance_result_stage', { p_submission_id: submissionId, p_action: 'return', p_reason: returnReason })
    setBusy(false)
    if (error) { alert(error.message); return }
    setReturnReason('')
    setExpanded(null)
    loadQueue()
  }

  async function handlePublish(submissionId: string) {
    setBusy(true)
    const { error } = await supabase.rpc('publish_course_result', { p_submission_id: submissionId })
    setBusy(false)
    if (error) { alert(error.message); return }
    loadQueue()
  }

  return (
    <div className="max-w-3xl">
      <h1 className="page-title mb-1">Result Review</h1>
      <p className="page-subtitle mb-6">Results awaiting your review or publication.</p>

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : queue.length === 0 ? (
        <p className="text-sm text-ink-faint">Nothing awaiting your review right now.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {queue.map(item => (
            <div key={item.submission_id} className="card p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(item)}>
                <div>
                  <p className="font-medium text-ink">{item.subject_code ? `${item.subject_code} — ` : ''}{item.subject_name}</p>
                  <p className="text-xs text-ink-muted">
                    {item.cohort_name} · {item.department_name}{item.faculty_name ? ` (${item.faculty_name})` : ''} · {item.student_count} students · {item.lecturer_name}
                  </p>
                </div>
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700">{statusLabel[item.status]}</span>
              </div>

              {expanded === item.submission_id && detail && (
                <div className="mt-4 border-t border-surface-200 pt-4">
                  <table className="w-full text-sm mb-4">
                    <thead>
                      <tr className="text-left text-xs text-ink-faint uppercase tracking-wider">
                        <th className="pb-2">Student</th>
                        <th className="pb-2">Total</th>
                        <th className="pb-2">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detail.students ?? []).map((s: any) => (
                        <tr key={s.learner_id} className="border-t border-surface-100">
                          <td className="py-1.5">{s.name}<br /><span className="text-xs text-ink-faint">{s.admission_number}</span></td>
                          <td className="py-1.5">{s.total_score}</td>
                          <td className="py-1.5">{s.grade_letter} ({s.grade_point})</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {item.action === 'publish' ? (
                    <button onClick={() => handlePublish(item.submission_id)} disabled={busy} className="btn-primary btn">
                      {busy ? 'Publishing…' : 'Publish Result'}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-3">
                        <button onClick={() => handleApprove(item.submission_id)} disabled={busy} className="btn-primary btn">
                          {busy ? 'Working…' : 'Approve'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text" placeholder="Reason for returning (required)"
                          className="input flex-1"
                          value={returnReason} onChange={e => setReturnReason(e.target.value)}
                        />
                        <button onClick={() => handleReturn(item.submission_id)} disabled={busy} className="btn-secondary btn">Return</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}