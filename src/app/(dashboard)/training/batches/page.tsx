// FILE: src/app/(dashboard)/training/batches/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TrainingBatchesPage({ searchParams }: { searchParams: Promise<{ programme_id?: string }> }) {
  const { programme_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase
    .from('groups')
    .select('id, name, code, is_active, training_programmes(id, name)')
    .eq('organization_id', profile?.organization_id)
    .eq('type', 'batch')
    .order('name')

  if (programme_id) query = query.eq('training_programme_id', programme_id)

  const { data: batches } = await query

  const { data: programmes } = await supabase
    .from('training_programmes')
    .select('id, name')
    .eq('organization_id', profile?.organization_id)
    .order('name')

  const activeProgramme = programme_id ? programmes?.find(p => p.id === programme_id) : null

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link href="/training/programmes" className="text-sm text-ink-muted hover:text-ink">Training Programmes</Link>
        {activeProgramme && (
          <>
            <span className="text-ink-faint">/</span>
            <span className="text-sm text-ink font-medium">{activeProgramme.name}</span>
          </>
        )}
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Batches{activeProgramme ? ` — ${activeProgramme.name}` : ''}</h1>
          <p className="page-subtitle">A programme can run multiple batches — e.g. "January 2027" or "Weekend".</p>
        </div>
        <Link href={`/training/batches/new${programme_id ? `?programme_id=${programme_id}` : ''}`} className="btn-primary btn">Add Batch</Link>
      </div>

      {!batches || batches.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted mb-1">No batches yet.</p>
          <p className="text-xs text-ink-faint">Add a batch to start enrolling learners.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-200">
          {batches.map((b: any) => (
            <div key={b.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{b.name}</p>
                  {b.code && <span className="badge badge-gray font-mono text-[10px]">{b.code}</span>}
                  {!b.is_active && <span className="badge badge-gray text-[10px]">Inactive</span>}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{b.training_programmes?.name}</p>
              </div>
              <div className="flex gap-3">
                <Link href={`/training/enrolments?batch_id=${b.id}`} className="text-xs text-brand-500 hover:underline">View enrolments</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}