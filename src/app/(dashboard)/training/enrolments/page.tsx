// FILE: src/app/(dashboard)/training/enrolments/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TrainingEnrolmentsPage({ searchParams }: { searchParams: Promise<{ batch_id?: string }> }) {
  const { batch_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  let query = supabase
    .from('training_enrolments')
    .select('id, status, enrolled_at, learners(id, first_name, last_name, admission_number), training_programmes(name), batch:groups!training_enrolments_batch_group_id_fkey(name)')
    .eq('organization_id', profile?.organization_id)
    .order('enrolled_at', { ascending: false })

  if (batch_id) query = query.eq('batch_group_id', batch_id)

  const { data: enrolments } = await query

  const { data: batches } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', profile?.organization_id)
    .eq('type', 'batch')
    .order('name')

  const activeBatch = batch_id ? batches?.find(b => b.id === batch_id) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Enrolments{activeBatch ? ` — ${activeBatch.name}` : ''}</h1>
          <p className="page-subtitle">Learners enrolled into a training programme and batch.</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/training/learners/new${batch_id ? `?batch_id=${batch_id}` : ''}`} className="btn-primary btn">Add New Learner</Link>
          <Link href={`/training/enrolments/new${batch_id ? `?batch_id=${batch_id}` : ''}`} className="btn-secondary btn">Enrol Existing Learner</Link>
        </div>
      </div>

      {!enrolments || enrolments.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted mb-1">No enrolments yet.</p>
          <p className="text-xs text-ink-faint">Enrol a learner into a programme and batch to get started.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-200">
          {enrolments.map((e: any) => (
            <div key={e.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{e.learners?.first_name} {e.learners?.last_name}</p>
                <p className="text-xs text-ink-muted mt-0.5">
                  {e.training_programmes?.name} · {e.batch?.name}
                  {e.learners?.admission_number && <span className="font-mono"> · {e.learners.admission_number}</span>}
                </p>
              </div>
              <span className={`badge text-[10px] ${e.status === 'registered' ? 'badge-blue' : e.status === 'completed' ? 'badge-gray' : 'badge-gray'}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}