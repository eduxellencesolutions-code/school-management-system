import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateSubject } from '@/app/(dashboard)/settings/subjects/actions'

interface Props { params: Promise<{ id: string }> }

export default async function EditSubjectPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id

  const { data: subject } = await supabase.from('subjects').select('*').eq('id', id).single()
  if (!subject) notFound()

  let groups, templates

  if (orgId) {
    // ✅ Institution: scope to org
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from('groups').select('id, name').eq('organization_id', orgId).eq('is_active', true).order('name'),
      supabase.from('assessment_templates').select('id, name, is_default').eq('organization_id', orgId).order('name'),
    ])
    groups = g
    templates = t
  } else {
    // ✅ Solo teacher: scope to their own classes, and templates with organization_id IS NULL
    const [{ data: g }, { data: t }] = await Promise.all([
      supabase.from('groups').select('id, name').eq('instructor_id', user.id).eq('is_active', true).order('name'),
      supabase.from('assessment_templates').select('id, name, is_default').is('organization_id', null).order('name'),
    ])
    groups = g
    templates = t
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/subjects" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Subjects
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Edit — {subject.name}</span>
      </div>

      <div>
        <h1 className="page-title">Edit subject</h1>
        <p className="page-subtitle">Update the subject name, class, or assessment template.</p>
      </div>

      <form action={updateSubject} className="card p-5 flex flex-col gap-4">
        <input type="hidden" name="id" value={subject.id} />

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Subject name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              required
              defaultValue={subject.name}
              placeholder="e.g. Mathematics"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Subject code (optional)</label>
            <input
              name="code"
              defaultValue={subject.code ?? ''}
              placeholder="e.g. MTH"
              className="input font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">
            Class <span className="text-red-500">*</span>
          </label>
          <select name="group_id" required className="input" defaultValue={subject.group_id ?? ''}>
            <option value="">Select a class…</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Assessment template</label>
          <select name="template_id" className="input" defaultValue={subject.template_id ?? ''}>
            <option value="">No template</option>
            {templates?.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.is_default ? ' (default)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary btn">Save changes</button>
          <Link href="/settings/subjects" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}
