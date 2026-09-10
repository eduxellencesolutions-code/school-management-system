// FILE: src/app/(dashboard)/cohorts/[groupId]/register/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { registerLearnerCourses } from './actions'

export default async function RegisterCoursesPage({
  params, searchParams,
}: {
  params: Promise<{ groupId: string }>
  searchParams: Promise<{ learner_id?: string; error?: string; success?: string }>
}) {
  const { groupId } = await params
  const { learner_id, error, success } = await searchParams
  const supabase = await createClient()

  const { data: cohort } = await supabase.from('groups').select('id, name, session_id, term_id').eq('id', groupId).single()
  const { data: learners } = await supabase.from('learners').select('id, first_name, last_name, admission_number').eq('group_id', groupId).order('first_name')
  const { data: courses } = await supabase.from('subjects').select('id, name, code, credit_unit').eq('group_id', groupId).order('code')

  const selectedLearnerId = learner_id || learners?.[0]?.id

  let registeredCourseIds: string[] = []
  if (selectedLearnerId && cohort?.term_id) {
    const { data: regs } = await supabase.from('course_registrations').select('subject_id').eq('learner_id', selectedLearnerId).eq('term_id', cohort.term_id).eq('status', 'registered')
    registeredCourseIds = (regs ?? []).map(r => r.subject_id)
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cohorts" className="text-sm text-ink-muted hover:text-ink">Cohorts</Link>
        <span className="text-ink-faint">/</span>
        <span className="text-sm text-ink font-medium">{cohort?.name} — Register Courses</span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"><p className="text-sm text-green-700">{decodeURIComponent(success)}</p></div>}

      {!learners || learners.length === 0 ? (
        <p className="text-sm text-ink-faint">No students in this cohort yet.</p>
      ) : !courses || courses.length === 0 ? (
        <p className="text-sm text-ink-faint">No courses set up for this cohort yet. <Link href={`/courses/new?group_id=${groupId}`} className="text-brand-500 hover:underline">Add a course</Link>.</p>
      ) : (
        <div className="card p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink mb-1">Student</label>
            <div className="flex flex-wrap gap-2">
              {learners.map(l => (
                <Link
                  key={l.id}
                  href={`/cohorts/${groupId}/register?learner_id=${l.id}`}
                  className={`text-xs px-3 py-1.5 rounded-full border ${l.id === selectedLearnerId ? 'bg-brand-500 text-white border-brand-500' : 'border-surface-200 text-ink-muted hover:border-brand-500'}`}
                >
                  {l.first_name} {l.last_name}
                </Link>
              ))}
            </div>
          </div>

          <form action={registerLearnerCourses} className="flex flex-col gap-3">
            <input type="hidden" name="group_id" value={groupId} />
            <input type="hidden" name="learner_id" value={selectedLearnerId} />
            <input type="hidden" name="session_id" value={cohort?.session_id ?? ''} />
            <input type="hidden" name="term_id" value={cohort?.term_id ?? ''} />

            <p className="text-sm font-medium text-ink mb-1">Courses</p>
            {courses.map(c => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="course_ids" value={c.id} defaultChecked={registeredCourseIds.includes(c.id)} />
                {c.code ? `${c.code} — ` : ''}{c.name} ({c.credit_unit ?? '?'} units)
              </label>
            ))}

            <button type="submit" className="btn-primary btn w-fit mt-2">Save registrations</button>
          </form>
        </div>
      )}
    </div>
  )
}