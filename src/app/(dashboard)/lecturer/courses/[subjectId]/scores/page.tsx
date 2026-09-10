// FILE: src/app/(dashboard)/lecturer/courses/[subjectId]/scores/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Component { id: string; name: string; max_score: number; sequence: number }
interface Student { id: string; first_name: string; last_name: string; admission_number: string | null }

export default function ScoreEntryPage() {
  const { subjectId } = useParams<{ subjectId: string }>()
  const supabase = createClient()

  const [courseName, setCourseName] = useState('')
  const [components, setComponents] = useState<Component[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [values, setValues] = useState<Record<string, Record<string, string>>>({}) // learnerId -> componentId -> value
  const [isFinal, setIsFinal] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: subject } = await supabase.from('subjects').select('name, code, template_id, group_id').eq('id', subjectId).single()
      setCourseName(subject ? `${subject.code ? subject.code + ' — ' : ''}${subject.name}` : '')

      const { data: comps } = await supabase.from('assessment_components').select('id, name, max_score, sequence').eq('template_id', subject?.template_id).order('sequence')
      setComponents(comps ?? [])

      const { data: regs } = await supabase
        .from('course_registrations')
        .select('learner_id, learners(id, first_name, last_name, admission_number)')
        .eq('subject_id', subjectId).eq('status', 'registered')
      const studentList = (regs ?? []).map((r: any) => r.learners).filter(Boolean)
      setStudents(studentList)

      const { data: existingScores } = await supabase.from('scores').select('learner_id, component_id, score, is_final').eq('subject_id', subjectId)
      const grid: Record<string, Record<string, string>> = {}
      let anyFinal = false
      for (const s of existingScores ?? []) {
        if (!grid[s.learner_id]) grid[s.learner_id] = {}
        grid[s.learner_id][s.component_id] = String(s.score ?? '')
        if (s.is_final) anyFinal = true
      }
      setValues(grid)
      setIsFinal(anyFinal)

      const { data: sub } = await supabase.from('course_result_submissions').select('status').eq('subject_id', subjectId).maybeSingle()
      setSubmissionStatus(sub?.status ?? null)

      setLoading(false)
    }
    load()
  }, [subjectId])

  function setValue(learnerId: string, componentId: string, value: string) {
    setValues(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: value } }))
  }

  function totalFor(learnerId: string) {
    const row = values[learnerId] ?? {}
    return components.reduce((sum, c) => sum + (Number(row[c.id]) || 0), 0)
  }

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)
    const entries = []
    for (const student of students) {
      for (const comp of components) {
        const raw = values[student.id]?.[comp.id]
        if (raw !== undefined && raw !== '') {
          entries.push({ learner_id: student.id, component_id: comp.id, score: Number(raw) })
        }
      }
    }
    const { data, error } = await supabase.rpc('save_course_scores', { p_subject_id: subjectId, p_entries: entries })
    setIsSaving(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    if (data?.failed > 0) {
      setMessage({ type: 'error', text: `Saved ${data.saved}, but ${data.failed} failed: ${data.failed_details.map((f: any) => f.error).join('; ')}` })
    } else {
      setMessage({ type: 'success', text: `Saved ${data.saved} score(s).` })
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    setMessage(null)
    const { error } = await supabase.rpc('submit_course_result', { p_subject_id: subjectId })
    setIsSubmitting(false)
    if (error) { setMessage({ type: 'error', text: error.message }); return }
    setMessage({ type: 'success', text: 'Submitted for department review.' })
    setIsFinal(true)
    setSubmissionStatus('lecturer_submitted')
  }

  const locked = isFinal && submissionStatus !== 'returned'

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/lecturer/courses" className="text-sm text-ink-muted hover:text-ink">My Courses</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">{courseName}</span>
      </div>
      <h1 className="page-title mb-1">{courseName}</h1>
      <p className="page-subtitle mb-6">
        {locked ? 'Scores are locked — this result has been submitted for review.' : 'Enter scores for each registered student, then submit for review.'}
      </p>

      {message && (
        <div className={`border rounded-lg p-3 mb-4 text-sm ${message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-ink-faint">No students registered for this course yet.</p>
      ) : (
        <div className="card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wider">
                <th className="pb-2 pr-3">Student</th>
                {components.map(c => <th key={c.id} className="pb-2 pr-3">{c.name} (/{c.max_score})</th>)}
                <th className="pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-t border-surface-100">
                  <td className="py-2 pr-3">{s.first_name} {s.last_name}<br /><span className="text-xs text-ink-faint">{s.admission_number}</span></td>
                  {components.map(c => (
                    <td key={c.id} className="py-2 pr-3">
                      <input
                        type="number" min={0} max={c.max_score}
                        className="input w-20"
                        disabled={locked}
                        value={values[s.id]?.[c.id] ?? ''}
                        onChange={e => setValue(s.id, c.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="py-2 font-medium">{totalFor(s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!locked && (
            <div className="flex gap-3 mt-4">
              <button onClick={handleSave} disabled={isSaving} className="btn-secondary btn">{isSaving ? 'Saving…' : 'Save Scores'}</button>
              <button onClick={handleSubmit} disabled={isSubmitting} className="btn-primary btn">{isSubmitting ? 'Submitting…' : 'Submit for Review'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}