import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen, Pencil } from 'lucide-react'
import { deleteSubject } from './actions'

export default async function SubjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id

  // ✅ Allow solo teachers AND institution admins
  // Solo teachers: orgId = null, role = 'teacher'
  // Institution admins: orgId = uuid, role = 'admin'

  // ✅ Build query based on user type
  let subjectsQuery = supabase
    .from('subjects')
    .select('id, name, code, group_id, template_id, is_active')
    .eq('is_active', true)
    .order('name')

  let groupsQuery = supabase
    .from('groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let templatesQuery = supabase
    .from('assessment_templates')
    .select('id, name')
    .order('name')

  if (orgId) {
    // ✅ Institution admin: filter by organization_id
    subjectsQuery = subjectsQuery.eq('organization_id', orgId)
    groupsQuery = groupsQuery.eq('organization_id', orgId)
    templatesQuery = templatesQuery.eq('organization_id', orgId)
  } else {
    // ✅ Solo teacher: show only their subjects (by instructor_id)
    // Subjects don't have instructor_id directly, so we filter by group_id
    // First get the solo teacher's groups
    const { data: teacherGroups } = await supabase
      .from('groups')
      .select('id')
      .eq('instructor_id', user.id)
      .eq('is_active', true)

    const groupIds = teacherGroups?.map(g => g.id) || []
    
    if (groupIds.length > 0) {
      subjectsQuery = subjectsQuery.in('group_id', groupIds)
      groupsQuery = groupsQuery.in('id', groupIds)
    } else {
      // No groups, return empty arrays
      const { data: empty } = await supabase.from('subjects').select('id').limit(0)
      return (
        <div className="flex flex-col gap-6 max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title">Subjects</h1>
              <p className="page-subtitle">
                Create a class first to start adding subjects.
              </p>
            </div>
            <Link href="/classes/new" className="btn-primary btn shrink-0">
              <Plus size={14} /> Create Class
            </Link>
          </div>
          <div className="card py-16 flex flex-col items-center text-center">
            <BookOpen size={40} className="text-surface-200 mb-4" />
            <h3 className="font-semibold text-ink mb-1">No subjects yet</h3>
            <p className="text-sm text-ink-muted mb-6 max-w-xs">
              Create a class first, then add subjects to it.
            </p>
            <Link href="/classes/new" className="btn-primary btn">
              <Plus size={14} /> Create first class
            </Link>
          </div>
        </div>
      )
    }

    // Solo teachers can see templates with organization_id = null
    templatesQuery = templatesQuery.is('organization_id', null)
  }

  const [{ data: subjects }, { data: groups }, { data: templates }] = await Promise.all([
    subjectsQuery,
    groupsQuery,
    templatesQuery,
  ])

  const groupMap = Object.fromEntries((groups ?? []).map(g => [g.id, g.name]))
  const templateMap = Object.fromEntries((templates ?? []).map(t => [t.id, t.name]))

  const byGroup: Record<string, typeof subjects> = {}
  for (const s of subjects ?? []) {
    const gid = s.group_id ?? 'ungrouped'
    if (!byGroup[gid]) byGroup[gid] = []
    byGroup[gid]!.push(s)
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">
            {orgId 
              ? 'Manage subjects across all classes in your organization.'
              : 'Manage subjects for your classes.'}
          </p>
        </div>
        <Link href={`/settings/subjects/new${orgId ? '' : '?solo=true'}`} className="btn-primary btn shrink-0">
          <Plus size={14} /> Add subject
        </Link>
      </div>

      {Object.keys(byGroup).length > 0 ? (
        <div className="flex flex-col gap-4">
          {Object.entries(byGroup).map(([groupId, subs]) => (
            <div key={groupId} className="card overflow-hidden">
              <div className="card-header bg-surface-50">
                <h2 className="font-semibold text-sm text-ink">
                  {groupMap[groupId] ?? 'Ungrouped'}
                  <span className="text-ink-faint font-normal ml-1">({subs?.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-surface-200">
                {subs?.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 group">
                    <div className="w-8 h-8 rounded bg-green-50 text-green-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ink">{s.name}</span>
                        {s.code && <span className="badge badge-gray font-mono text-[10px]">{s.code}</span>}
                      </div>
                      <span className="text-xs text-ink-muted">
                        {s.template_id
                          ? templateMap[s.template_id] ?? 'Unknown template'
                          : <span className="text-amber-600">No template assigned</span>
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/settings/subjects/${s.id}`}
                        className="btn-secondary btn-sm btn"
                      >
                        <Pencil size={12} /> Edit
                      </Link>
                      <form action={deleteSubject}>
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
                        >
                          Remove
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center text-center">
          <BookOpen size={40} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No subjects yet</h3>
          <p className="text-sm text-ink-muted mb-6 max-w-xs">
            {orgId 
              ? 'Add subjects to your classes so teachers can enter scores.'
              : 'Create a class first, then add subjects to it.'}
          </p>
          <Link href={orgId ? '/settings/subjects/new' : '/classes/new'} className="btn-primary btn">
            <Plus size={14} /> {orgId ? 'Add first subject' : 'Create first class'}
          </Link>
        </div>
      )}
    </div>
  )
}
