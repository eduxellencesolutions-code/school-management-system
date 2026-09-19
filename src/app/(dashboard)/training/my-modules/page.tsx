// FILE: src/app/(dashboard)/training/my-modules/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MyTrainingModulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: modules } = await supabase
    .from('training_modules')
    .select('id, name, sequence, template_id, training_programme_id, training_programmes(id, name)')
    .eq('trainer_id', user!.id)
    .order('name')

  // Batches a trainer's modules could run against — derived from real
  // enrolments in the module's programme, since there's no direct
  // trainer-to-batch assignment in the schema (a module belongs to a
  // programme; any batch of that programme is a valid submission target).
  const programmeIds = [...new Set((modules ?? []).map(m => m.training_programme_id))]
  let batchesByProgramme = new Map<string, { id: string; name: string }[]>()

  if (programmeIds.length > 0) {
    const { data: enrolments } = await supabase
      .from('training_enrolments')
      .select('training_programme_id, batch_group_id, groups!training_enrolments_batch_group_id_fkey(id, name)')
      .in('training_programme_id', programmeIds)
      .eq('status', 'registered')

    const seen = new Map<string, Map<string, { id: string; name: string }>>()
    ;(enrolments ?? []).forEach((e: any) => {
      if (!seen.has(e.training_programme_id)) seen.set(e.training_programme_id, new Map())
      if (e.groups) seen.get(e.training_programme_id)!.set(e.groups.id, e.groups)
    })
    seen.forEach((map, pid) => batchesByProgramme.set(pid, [...map.values()]))
  }

  return (
    <div>
      <h1 className="page-title mb-1">My Modules</h1>
      <p className="page-subtitle mb-6">Modules assigned to you. Select a batch to enter scores or submit.</p>

      {!modules || modules.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted">No modules assigned to you yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {modules.map((m: any) => {
            const batches = batchesByProgramme.get(m.training_programme_id) ?? []
            return (
              <div key={m.id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-ink-muted">{m.training_programmes?.name}</p>
                  </div>
                  {!m.template_id && <span className="badge badge-gray text-[10px]">No assessment template — contact admin</span>}
                </div>
                {batches.length === 0 ? (
                  <p className="text-xs text-ink-faint">No learners enrolled in this programme yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {batches.map(b => (
                      <Link
                        key={b.id}
                        href={`/training/my-modules/${m.id}?batch=${b.id}`}
                        className="btn-secondary btn-sm btn"
                      >
                        {b.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}