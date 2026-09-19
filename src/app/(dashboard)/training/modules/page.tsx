// FILE: src/app/(dashboard)/training/modules/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TrainingModulesPage({ searchParams }: { searchParams: Promise<{ programme_id?: string }> }) {
  const { programme_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase
    .from('training_modules')
    .select('id, name, sequence, description, template_id, trainer_id, is_active, training_programmes(id, name), trainer:users(name)')
    .eq('organization_id', profile?.organization_id)
    .order('sequence')

  if (programme_id) query = query.eq('training_programme_id', programme_id)

  const { data: modules } = await query

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
          <h1 className="page-title mb-1">Modules{activeProgramme ? ` — ${activeProgramme.name}` : ''}</h1>
          <p className="page-subtitle">The units learners work through within a programme.</p>
        </div>
        <Link href={`/training/modules/new${programme_id ? `?programme_id=${programme_id}` : ''}`} className="btn-primary btn">Add Module</Link>
      </div>

      {!modules || modules.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted mb-1">No modules yet.</p>
          <p className="text-xs text-ink-faint">Add a module to start assigning trainers and entering scores.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-200">
          {modules.map((m: any) => (
            <div key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-gray text-[10px]">#{m.sequence}</span>
                  <p className="font-medium text-ink">{m.name}</p>
                  {!m.template_id && <span className="badge badge-gray text-[10px]">No assessment template</span>}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">
                  {m.training_programmes?.name}{m.trainer ? ` · Trainer: ${m.trainer.name}` : ' · No trainer assigned'}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href={`/training/modules/${m.id}/edit`} className="text-xs text-brand-500 hover:underline">Edit</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}