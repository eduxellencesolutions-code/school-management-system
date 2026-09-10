// FILE: src/app/(dashboard)/departments/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function DepartmentsPage({ searchParams }: { searchParams: Promise<{ faculty_id?: string }> }) {
  const { faculty_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase.from('departments').select('id, name, code, faculty_id, faculties(name)').eq('organization_id', profile?.organization_id)
  if (faculty_id) query = query.eq('faculty_id', faculty_id)
  const { data: departments } = await query.order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Departments</h1>
          <p className="page-subtitle">Manage departments within your faculties.</p>
        </div>
        <Link href="/departments/new" className="btn-primary btn">Add Department</Link>
      </div>

      {!departments || departments.length === 0 ? (
        <p className="text-sm text-ink-faint">No departments yet.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {departments.map((d: any) => (
            <div key={d.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{d.name}{d.code ? ` (${d.code})` : ''}</p>
                <p className="text-xs text-ink-muted">{d.faculties?.name}</p>
              </div>
              <Link href={`/programmes?department_id=${d.id}`} className="text-xs text-brand-500 hover:underline">View programmes</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}