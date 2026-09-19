// FILE: src/app/(dashboard)/training/programmes/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TrainingProgrammesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  const { data: programmes } = await supabase
    .from('training_programmes')
    .select('id, name, code, description, duration, is_active')
    .eq('organization_id', profile?.organization_id)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Training Programmes</h1>
          <p className="page-subtitle">The courses your centre offers — e.g. Data Analysis, Digital Marketing, Computer Training.</p>
        </div>
        <Link href="/training/programmes/new" className="btn-primary btn">Add Programme</Link>
      </div>

      {!programmes || programmes.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-ink-muted mb-1">No training programmes yet.</p>
          <p className="text-xs text-ink-faint">Add your first programme to start building out modules and batches.</p>
        </div>
      ) : (
        <div className="card divide-y divide-surface-200">
          {programmes.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink">{p.name}</p>
                  {p.code && <span className="badge badge-gray font-mono text-[10px]">{p.code}</span>}
                  {!p.is_active && <span className="badge badge-gray text-[10px]">Inactive</span>}
                </div>
                {p.description && <p className="text-xs text-ink-muted mt-0.5">{p.description}</p>}
                {p.duration && <p className="text-xs text-ink-faint mt-0.5">{p.duration}</p>}
              </div>
              <div className="flex gap-3">
                <Link href={`/training/modules?programme_id=${p.id}`} className="text-xs text-brand-500 hover:underline">View modules</Link>
                <Link href={`/training/batches?programme_id=${p.id}`} className="text-xs text-brand-500 hover:underline">View batches</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}