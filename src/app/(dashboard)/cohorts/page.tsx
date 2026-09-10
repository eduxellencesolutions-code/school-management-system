// FILE: src/app/(dashboard)/cohorts/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CohortsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  const { data: cohorts } = await supabase
    .from('groups')
    .select('id, name, code, level, programmes(name), terms(name)')
    .eq('organization_id', profile?.organization_id)
    .eq('type', 'cohort')
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Cohorts</h1>
          <p className="page-subtitle">Level-cohorts within a programme for a given semester (e.g. "300L Agric Econ — First Semester").</p>
        </div>
        <Link href="/cohorts/new" className="btn-primary btn">Add Cohort</Link>
      </div>

      {!cohorts || cohorts.length === 0 ? (
        <p className="text-sm text-ink-faint">No cohorts yet.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {cohorts.map((c: any) => (
            <div key={c.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-xs text-ink-muted">{c.programmes?.name} · {c.level} · {c.terms?.name}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`/courses?group_id=${c.id}`} className="text-xs text-brand-500 hover:underline">View courses</Link>
                <Link href={`/cohorts/${c.id}/register`} className="text-xs text-brand-500 hover:underline">Register students</Link>
                <Link href={`/cohorts/${c.id}/bulk-register`} className="text-xs text-brand-500 hover:underline">Bulk register</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}