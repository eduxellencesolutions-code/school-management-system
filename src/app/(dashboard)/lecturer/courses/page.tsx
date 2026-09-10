// FILE: src/app/(dashboard)/lecturer/courses/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MyCoursesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courses } = await supabase
    .from('subjects')
    .select('id, name, code, credit_unit, group_id, groups(name, term_id, terms(name))')
    .eq('instructor_id', user!.id)
    .order('code')

  const courseIds = (courses ?? []).map((c: any) => c.id)

  const { data: submissions } = courseIds.length > 0
    ? await supabase.from('course_result_submissions').select('subject_id, status, return_reason').in('subject_id', courseIds)
    : { data: [] }

  const statusBySubject = new Map((submissions ?? []).map((s: any) => [s.subject_id, s]))

  const statusLabel: Record<string, { label: string; color: string }> = {
    draft: { label: 'Not submitted', color: 'bg-surface-100 text-ink-muted' },
    lecturer_submitted: { label: 'Awaiting department review', color: 'bg-blue-50 text-blue-700' },
    pending_faculty: { label: 'Awaiting faculty review', color: 'bg-blue-50 text-blue-700' },
    pending_registry: { label: 'Awaiting registry review', color: 'bg-blue-50 text-blue-700' },
    pending_senate: { label: 'Awaiting Senate approval', color: 'bg-purple-50 text-purple-700' },
    senate_approved: { label: 'Senate approved — awaiting publication', color: 'bg-green-50 text-green-700' },
    published: { label: 'Published', color: 'bg-green-100 text-green-800' },
    returned: { label: 'Returned for correction', color: 'bg-red-50 text-red-700' },
  }

  return (
    <div>
      <h1 className="page-title mb-1">My Courses</h1>
      <p className="page-subtitle mb-6">Every course assigned to you this session.</p>

      {!courses || courses.length === 0 ? (
        <p className="text-sm text-ink-faint">No courses assigned to you yet.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {courses.map((c: any) => {
            const sub = statusBySubject.get(c.id)
            const status = statusLabel[sub?.status ?? 'draft']
            return (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-ink">{c.code ? `${c.code} — ` : ''}{c.name}</p>
                  <p className="text-xs text-ink-muted">{c.groups?.name} · {c.groups?.terms?.name} · {c.credit_unit ?? '?'} units</p>
                  {sub?.status === 'returned' && sub.return_reason && (
                    <p className="text-xs text-red-600 mt-1">Returned: {sub.return_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
                  <Link href={`/lecturer/courses/${c.id}/scores`} className="text-xs text-brand-500 hover:underline">Enter scores</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}