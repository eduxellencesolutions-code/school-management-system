import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, Plus, Upload } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props { searchParams: { class?: string; q?: string } }

export default async function StudentsPage({ searchParams }: Props) {
  // ✅ FIX: Add await here
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()
  
  const orgId = profile?.organization_id

  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, gender, is_active, created_at, group:groups(name)')
    .eq('organization_id', orgId ?? '00000000-0000-0000-0000-000000000000')
    .eq('is_active', true)
    .order('last_name')
    .limit(100)

  if (searchParams.class) query = query.eq('group_id', searchParams.class)

  const { data: learners } = await query

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{learners?.length ?? 0} student{learners?.length !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex gap-2">
          <Link href="/students/import" className="btn-secondary btn">
            <Upload size={14} /> Import CSV
          </Link>
          <Link href="/students/new" className="btn-primary btn">
            <Plus size={14} /> Add Student
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 items-center">
        <select
          defaultValue={searchParams.class ?? ''}
          onChange={(e) => {
            const url = new URL(window.location.href)
            e.target.value ? url.searchParams.set('class', e.target.value) : url.searchParams.delete('class')
            window.location.href = url.toString()
          }}
          className="input max-w-[200px]"
        >
          <option value="">All classes</option>
          {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {learners && learners.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Adm. No</th>
                  <th>Class</th>
                  <th>Gender</th>
                  <th>Enrolled</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l, i) => {
                  const group = l.group as unknown as { name: string } | null
                  return (
                    <tr key={l.id}>
                      <td className="text-ink-muted text-xs">{i + 1}</td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-surface-100 text-ink-muted text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {l.first_name[0]}{l.last_name[0]}
                          </div>
                          <span className="font-medium text-ink">{l.last_name} {l.first_name}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-ink-muted">{l.admission_number ?? '—'}</td>
                      <td className="text-ink-muted text-sm">{group?.name ?? '—'}</td>
                      <td>
                        {l.gender && (
                          <span className={`badge ${l.gender === 'M' ? 'badge-blue' : 'badge-amber'}`}>
                            {l.gender === 'M' ? 'Male' : l.gender === 'F' ? 'Female' : 'Other'}
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-ink-muted">{formatDate(l.created_at)}</td>
                      <td>
                        <Link href={`/students/${l.id}`} className="btn-ghost btn-sm btn">
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center text-center">
          <Users size={40} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No students yet</h3>
          <p className="text-sm text-ink-muted mb-6 max-w-xs">
            Add students one by one or import them all at once using a CSV file.
          </p>
          <div className="flex gap-2">
            <Link href="/students/import" className="btn-secondary btn">Import CSV</Link>
            <Link href="/students/new" className="btn-primary btn">Add student</Link>
          </div>
        </div>
      )}
    </div>
  )
}