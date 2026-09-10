// FILE: src/app/(student-portal)/portal/page.tsx
// This route should sit under its OWN auth-gated layout, separate
// from the staff dashboard — a student's Supabase session should
// never see /dashboard, /faculties, etc. Adjust the route group to
// wherever your student-facing layout actually lives.
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function StudentPortalPage() {
  const supabase = createClient()
  const [record, setRecord] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Deliberately the ONLY call — no learner_id anywhere on this
      // page, ever. The server derives identity from the session.
      const { data, error } = await supabase.rpc('get_my_tertiary_academic_record')
      if (error) { setError(error.message); setLoading(false); return }
      setRecord(data)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <p className="text-sm text-ink-faint p-6">Loading…</p>
  if (error) return <p className="text-sm text-red-600 p-6">{error}</p>
  if (!record) return null

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="card p-6 mb-6">
        <h1 className="page-title mb-1">{record.profile.first_name} {record.profile.last_name}</h1>
        <p className="text-sm text-ink-muted">
          {record.profile.admission_number} · {record.profile.programme_name} · {record.profile.department_name} · {record.profile.faculty_name} · Level {record.profile.current_level}
        </p>
      </div>

      <div className="card p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-ink-faint uppercase tracking-wider">Cumulative GPA</p>
          <p className="text-3xl font-bold text-ink">{record.cgpa.cgpa ?? '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-faint">Total credit units</p>
          <p className="text-sm text-ink-muted">{record.cgpa.total_credit_units}</p>
        </div>
      </div>

      {record.terms.map((term: any) => (
        <div key={term.term_id} className="card p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-medium text-ink">{term.term_name} — {term.session_name}</p>
            <p className="text-sm text-ink-muted">GPA: {term.gpa_detail.gpa ?? '—'}</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wider">
                <th className="pb-2">Course</th><th className="pb-2">Units</th><th className="pb-2">Score</th><th className="pb-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {term.gpa_detail.courses.map((c: any) => (
                <tr key={c.subject_id} className="border-t border-surface-100">
                  <td className="py-1.5">{c.code} — {c.name}</td>
                  <td className="py-1.5">{c.credit_unit}</td>
                  <td className="py-1.5">{c.total_score}</td>
                  <td className="py-1.5">{c.grade_letter} ({c.grade_point})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}