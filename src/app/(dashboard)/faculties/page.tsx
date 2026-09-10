// FILE: src/app/(dashboard)/faculties/page.tsx
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function FacultiesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

  const { data: faculties } = await supabase
    .from('faculties')
    .select('id, name, code, description, is_active')
    .eq('organization_id', profile?.organization_id)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title mb-1">Faculties</h1>
          <p className="page-subtitle">Manage your institution's faculties/schools.</p>
        </div>
        <Link href="/faculties/new" className="btn-primary btn">Add Faculty</Link>
      </div>

      {!faculties || faculties.length === 0 ? (
        <p className="text-sm text-ink-faint">No faculties yet. Add your first one to get started.</p>
      ) : (
        <div className="card divide-y divide-surface-200">
          {faculties.map(f => (
            <div key={f.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-ink">{f.name}{f.code ? ` (${f.code})` : ''}</p>
                {f.description && <p className="text-xs text-ink-muted">{f.description}</p>}
              </div>
              <Link href={`/departments?faculty_id=${f.id}`} className="text-xs text-brand-500 hover:underline">View departments</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}