'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Assignment {
  id: string
  subjectName: string | null
  title: string
  issuedDate: string
  dueDate: string
  status: 'submitted' | 'late' | 'not_submitted'
}

interface Summary {
  total: number
  submitted: number
  late: number
  missed: number
}

function statusBadge(status: string) {
  switch (status) {
    case 'submitted':
      return <span className="badge badge-green text-[10px] flex items-center gap-1 w-fit"><CheckCircle2 size={11} /> Submitted</span>
    case 'late':
      return <span className="badge badge-amber text-[10px] flex items-center gap-1 w-fit"><Clock size={11} /> Late</span>
    default:
      return <span className="badge badge-gray text-[10px] flex items-center gap-1 w-fit"><XCircle size={11} /> Not Submitted</span>
  }
}

export default function HomeworkView({ learnerId }: { learnerId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [featureDisabled, setFeatureDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/parents/homework?learnerId=${learnerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error)
        } else {
          setAssignments(data.assignments ?? [])
          setSummary(data.summary ?? null)
          setFeatureDisabled(!!data.featureDisabled)
        }
      })
      .catch(() => setError('Could not load homework.'))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading homework...
      </div>
    )
  }

  if (error) {
    return <div className="card p-6 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/parent/dashboard" className="text-sm text-brand-500 hover:underline flex items-center gap-1 w-fit">
        <ArrowLeft size={14} /> Back to dashboard
      </Link>

      <div>
        <h1 className="page-title">Homework</h1>
        <p className="page-subtitle">Assignments and submission status for this term.</p>
      </div>

      {featureDisabled ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          Homework tracking is not enabled for this school.
        </div>
      ) : assignments.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No homework assignments recorded yet.
        </div>
      ) : (
        <>
          {summary && (
            <div className="card p-4 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-ink">{summary.total}</p>
                <p className="text-[10px] text-ink-faint">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{summary.submitted}</p>
                <p className="text-[10px] text-ink-faint">Submitted</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{summary.late}</p>
                <p className="text-[10px] text-ink-faint">Late</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{summary.missed}</p>
                <p className="text-[10px] text-ink-faint">Missed</p>
              </div>
            </div>
          )}

          <div className="card divide-y divide-surface-100">
            {assignments.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-ink-faint">
                    {a.subjectName ?? '—'} · Due {new Date(a.dueDate).toLocaleDateString('en-NG')}
                  </p>
                </div>
                {statusBadge(a.status)}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}