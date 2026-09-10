// FILE: src/app/(dashboard)/cohorts/[groupId]/bulk-register/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function BulkRegisterPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const supabase = createClient()

  const [cohortName, setCohortName] = useState('')
  const [studentCount, setStudentCount] = useState(0)
  const [courses, setCourses] = useState<{ id: string; name: string; code: string | null; credit_unit: number | null }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ students_processed: number; registrations_created: number; already_registered: number; failed: number; failed_details: any[] } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: cohort } = await supabase.from('groups').select('name').eq('id', groupId).single()
      setCohortName(cohort?.name ?? '')

      const { count } = await supabase.from('learners').select('id', { count: 'exact', head: true }).eq('group_id', groupId).eq('is_active', true)
      setStudentCount(count ?? 0)

      const { data: subjects } = await supabase.from('subjects').select('id, name, code, credit_unit').eq('group_id', groupId).order('code')
      setCourses(subjects ?? [])
      setLoading(false)
    }
    load()
  }, [groupId])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    const { data, error } = await supabase.rpc('bulk_register_cohort_courses', {
      p_group_id: groupId, p_subject_ids: Array.from(selected),
    })
    if (error) {
      alert(error.message)
      setIsSubmitting(false)
      return
    }
    setResult(data?.[0] ?? null)
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cohorts" className="text-sm text-ink-muted hover:text-ink">Cohorts</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">Bulk Register Courses</span>
      </div>
      <h1 className="page-title mb-1">{cohortName}</h1>
      <p className="page-subtitle mb-6">
        {studentCount} student{studentCount === 1 ? '' : 's'} — select compulsory courses to register everyone at once.
        For electives or exceptions, use <Link href={`/cohorts/${groupId}/register`} className="text-brand-500 hover:underline">individual registration</Link>.
      </p>

      {loading ? (
        <p className="text-sm text-ink-faint">Loading…</p>
      ) : courses.length === 0 ? (
        <p className="text-sm text-ink-faint">No courses set up for this cohort yet. <Link href={`/courses/new?group_id=${groupId}`} className="text-brand-500 hover:underline">Add a course</Link>.</p>
      ) : (
        <div className="card p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {courses.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                {c.code ? `${c.code} — ` : ''}{c.name} ({c.credit_unit ?? '?'} units)
              </label>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || isSubmitting}
            className="btn-primary btn w-fit"
          >
            {isSubmitting ? 'Registering…' : `Register ${studentCount} student${studentCount === 1 ? '' : 's'} for ${selected.size} course${selected.size === 1 ? '' : 's'}`}
          </button>

          {result && (
            <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-ink mb-1">Registration complete</p>
              <p className="text-ink-muted">
                {result.students_processed} students processed · {result.registrations_created} new registrations ·{' '}
                {result.already_registered} already registered · {result.failed} failed
              </p>
              {result.failed_details?.length > 0 && (
                <ul className="mt-2 text-xs text-red-600 list-disc list-inside">
                  {result.failed_details.map((f: any, i: number) => <li key={i}>{f.error}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}