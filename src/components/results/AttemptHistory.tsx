// FILE: src/components/results/AttemptHistory.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Attempt {
  registration_id: string
  attempt_number: number
  attempt_kind: string
  term_name: string
  session_name: string
  published: boolean
  grade_letter: string | null
  total_score: number | null
  outcome: string | null
}
interface CourseHistory { course_id: string | null; code: string | null; name: string | null; attempts: Attempt[] }

const KIND: Record<string, string> = { first: 'First attempt', resit: 'Resit', reassessment: 'Reassessment', repeat: 'Repeat' }
const OUTCOME: Record<string, string> = { pass: 'Pass', fail: 'Fail', incomplete: 'Incomplete', deferred: 'Deferred', withdrawn: 'Withdrawn', exempt: 'Exempt' }

export default function AttemptHistory({ learnerId, showAll = false }: { learnerId: string; showAll?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [rows, setRows] = useState<CourseHistory[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const { data, error } = await supabase.rpc('get_tertiary_attempt_history', { p_learner_id: learnerId })
      if (!cancelled) setRows(error ? [] : ((data ?? []) as CourseHistory[]))
    })()
    return () => { cancelled = true }
  }, [supabase, learnerId])

  const shown = (rows ?? []).filter(c => showAll || c.attempts.length > 1)
  if (rows === null || shown.length === 0) return null

  return (
    <section className="rounded-2xl border border-[var(--r-line,#E2DED5)] bg-[var(--r-card,#FFFFFF)] p-4 md:p-5" aria-label="Attempts at repeated courses">
      <p className="font-medium text-[var(--r-ink,#0D1117)] mb-1">Repeated courses and attempts</p>
      <p className="text-xs text-[var(--r-muted,#5A6472)] mb-3">Every attempt is kept. A result appears once it is published.</p>
      <ul className="space-y-3">
        {shown.map(c => (
          <li key={c.course_id ?? c.code ?? c.name ?? 'course'}>
            <p className="text-sm font-medium text-[var(--r-ink,#0D1117)]">{c.code ?? '—'} · {c.name ?? ''}</p>
            <ol className="mt-1 space-y-1">
              {c.attempts.map(a => (
                <li key={a.registration_id} className="text-sm text-[var(--r-muted,#5A6472)]">
                  Attempt {a.attempt_number} · {KIND[a.attempt_kind] ?? a.attempt_kind} · {a.term_name} ({a.session_name}):{' '}
                  {a.published
                    ? `grade ${a.grade_letter ?? '—'}${a.total_score !== null ? ` (${Number(a.total_score).toFixed(1)})` : ''}${a.outcome ? ` · ${OUTCOME[a.outcome] ?? a.outcome}` : ''}`
                    : 'result not published yet'}
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </section>
  )
}