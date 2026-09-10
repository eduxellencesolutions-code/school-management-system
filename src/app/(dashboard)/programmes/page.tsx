// FILE: src/app/(dashboard)/programmes/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ProgrammesPage({ searchParams }: { searchParams: Promise<{ department_id?: string }> }) {
  const { department_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase
    .from('programmes')
    .select('id, name, code, degree_type, duration_years, department_id, departments(name)')
    .eq('organization_id', profile?.organization_id)
  if (department_id) query = query.eq('department_id', department_id)
  const { data: programmes } = await query.order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Programmes</h1>
          <p className="page-subtitle">Degree programmes offered by your departments.</p>
        </div>
        <Link href="/programmes/new" className="btn-primary btn">Add Programme</Link>
      </div>

      {!programmes || programmes.length === 0 ? (
        <p className="text-sm text-ink-faint">No programmes yet.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {programmes.map((p: any) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{p.name}{p.code ? ` (${p.code})` : ''}</p>
                <p className="text-xs text-ink-muted">
                  {p.departments?.name}{p.degree_type ? ` · ${p.degree_type}` : ''}{p.duration_years ? ` · ${p.duration_years} years` : ''}
                </p>
              </div>
              <Link href={`/cohorts/new?programme_id=${p.id}`} className="text-xs text-brand-500 hover:underline">Add cohort</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}