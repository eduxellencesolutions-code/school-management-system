// FILE: src/app/(dashboard)/courses/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ group_id?: string }> }) {
  const { group_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase
    .from('subjects')
    .select('id, name, code, credit_unit, course_type, course_status, group_id, groups(name)')
    .eq('organization_id', profile?.organization_id)
  if (group_id) query = query.eq('group_id', group_id)
  const { data: courses } = await query.order('code')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Courses</h1>
          <p className="page-subtitle">Course catalog for your cohorts.</p>
        </div>
        <Link href={group_id ? `/courses/new?group_id=${group_id}` : '/courses/new'} className="btn-primary btn">Add Course</Link>
      </div>

      {!courses || courses.length === 0 ? (
        <p className="text-sm text-ink-faint">No courses yet.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {courses.map((c: any) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{c.code ? `${c.code} — ` : ''}{c.name}</p>
                <p className="text-xs text-ink-muted">{c.credit_unit ? `${c.credit_unit} units` : 'No credit unit set'} · {c.course_type} · {c.groups?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}