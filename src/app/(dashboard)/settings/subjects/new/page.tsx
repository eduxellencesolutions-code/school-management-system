import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createSubject } from '../actions'

// ✅ Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props { searchParams: Promise<{ class?: string; error?: string; success?: string }> }

export default async function NewSubjectPage({ searchParams }: Props) {
  const params = await searchParams
  const classId = params.class
  const error = params.error
  const success = params.success

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id

  // ✅ Build queries based on user type
  let groupsQuery = supabase
    .from('groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let templatesQuery = supabase
    .from('assessment_templates')
    .select('id, name, is_default')
    .order('name')

  if (orgId) {
    // ✅ Institution: filter by organization_id
    groupsQuery = groupsQuery.eq('organization_id', orgId)
    templatesQuery = templatesQuery.eq('organization_id', orgId)
  } else {
    // ✅ Solo teacher: show ONLY their own classes
    groupsQuery = groupsQuery.eq('instructor_id', user.id)
    // Solo teacher: show templates with organization_id = null OR instructor_id = user.id
    templatesQuery = templatesQuery.is('organization_id', null)
  }

  const [{ data: groups }, { data: templates }] = await Promise.all([
    groupsQuery,
    templatesQuery,
  ])

  // ✅ Also fetch solo teacher templates with instructor_id (if any)
  let soloTemplates: any[] = []
  if (!orgId) {
    const { data: instructorTemplates } = await supabase
      .from('assessment_templates')
      .select('id, name, is_default')
      .eq('instructor_id', user.id)
      .order('name')
    soloTemplates = instructorTemplates || []
  }

  // ✅ Combine templates (deduplicate)
  const allTemplates = [...(templates || [])]
  for (const t of soloTemplates) {
    if (!allTemplates.find(existing => existing.id === t.id)) {
      allTemplates.push(t)
    }
  }

  const defaultTemplate = allTemplates.find(t => t.is_default)

  // ✅ If no classes, show a helpful message
  if (!groups || groups.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-xl">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/settings/subjects" className="text-ink-muted hover:text-ink flex items-center gap-1">
            <ArrowLeft size={13} /> Subjects
          </Link>
          <span className="text-ink-faint">/</span>
          <span className="text-ink font-medium">Add subject</span>
        </div>

        <div className="card p-8 text-center">
          <h2 className="text-lg font-semibold text-ink mb-2">No classes found</h2>
          <p className="text-sm text-ink-muted mb-4">
            You need to create a class before you can add subjects.
          </p>
          <Link href="/classes/new" className="btn-primary btn">
            Create your first class
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/subjects" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Subjects
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Add subject</span>
      </div>

      <div>
        <h1 className="page-title">Add a subject</h1>
        <p className="page-subtitle">Assign it to a class and pick an assessment template.</p>
      </div>

      {/* ✅ Display error message from URL */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
      
      {/* ✅ Display success message if needed */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}

      <form action={createSubject} className="card p-5 flex flex-col gap-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Subject name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              autoFocus
              placeholder="e.g. Mathematics"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Subject code (optional)</label>
            <input
              name="code"
              placeholder="e.g. MTH"
              className="input font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Class <span className="text-red-500">*</span>
          </label>
          <select name="group_id" required className="input" defaultValue={classId ?? ''}>
            <option value="">Select a class…</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Assessment template</label>
          <select name="template_id" className="input" defaultValue={defaultTemplate?.id ?? ''}>
            <option value="">No template</option>
            {allTemplates.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_default ? ' (default)' : ''}
              </option>
            ))}
          </select>
          {allTemplates.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No templates yet.{' '}
              <Link href="/settings/templates/new" className="underline">Create one first →</Link>
            </p>
          )}
          <p className="text-xs text-ink-muted mt-1">
            Templates define scoring components (CA1, CA2, Exam…).
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary btn">Add subject</button>
          <Link href="/settings/subjects" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
