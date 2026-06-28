import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createSubject } from '../actions'

interface Props { searchParams: Promise<{ class?: string }> }

export default async function NewSubjectPage({ searchParams }: Props) {
  const { class: classId } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id

  const [{ data: groups }, { data: templates }] = await Promise.all([
    supabase.from('groups').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
    supabase.from('assessment_templates').select('id, name, is_default').eq('organization_id', orgId).order('name'),
  ])

  const defaultTemplate = templates?.find(t => t.is_default)

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
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Assessment template</label>
          <select name="template_id" className="input" defaultValue={defaultTemplate?.id ?? ''}>
            <option value="">No template</option>
            {templates?.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_default ? ' (default)' : ''}
              </option>
            ))}
          </select>
          {templates?.length === 0 && (
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
