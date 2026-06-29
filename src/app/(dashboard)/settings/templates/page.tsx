import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileSliders, Pencil, ArrowLeft } from 'lucide-react'
import { deleteTemplate } from './actions'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()
  const orgId = profile?.organization_id

  const { data: templates } = await supabase
    .from('assessment_templates')
    .select('id, name, description, is_default, created_at')
    .eq('organization_id', orgId)
    .order('created_at')

  const { data: components } = await supabase
    .from('assessment_components')
    .select('id, template_id, name, max_score, sequence')
    .in('template_id', templates?.map(t => t.id) ?? [])
    .order('sequence')

  const componentsByTemplate = (components ?? []).reduce<Record<string, typeof components>>((acc, c) => {
    if (!acc[c!.template_id]) acc[c!.template_id] = []
    acc[c!.template_id]!.push(c)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Assessment Templates</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Assessment Templates</h1>
          <p className="page-subtitle">
            Templates define how scores are structured — components like CA1, CA2, and Exam with their maximum scores.
            Each subject is assigned one template.
          </p>
        </div>
        <Link href="/settings/templates/new" className="btn-primary btn shrink-0">
          <Plus size={14} /> New template
        </Link>
      </div>

      {templates && templates.length > 0 ? (
        <div className="flex flex-col gap-3">
          {templates.map(t => {
            const comps = componentsByTemplate[t.id] ?? []
            const total = comps.reduce((sum, c) => sum + Number(c!.max_score), 0)
            return (
              <div key={t.id} className="card p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h2 className="font-semibold text-ink">{t.name}</h2>
                      {t.is_default && <span className="badge badge-blue text-[10px]">Default</span>}
                    </div>
                    {t.description && <p className="text-xs text-ink-muted">{t.description}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/settings/templates/${t.id}`} className="btn-secondary btn-sm btn">
                      <Pencil size={12} /> Edit
                    </Link>
                    <form action={deleteTemplate}>
                      <input type="hidden" name="id" value={t.id} />
                      <button
                        type="submit"
                        className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                {comps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {comps.map(c => (
                      <div key={c!.id} className="flex items-center gap-1.5 bg-surface-50 border border-surface-200 rounded px-2.5 py-1.5">
                        <span className="text-xs font-medium text-ink">{c!.name}</span>
                        <span className="text-[10px] text-ink-muted">/{c!.max_score}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 bg-brand-50 border border-brand-100 rounded px-2.5 py-1.5 ml-1">
                      <span className="text-xs font-semibold text-brand-600">Total: {total}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600">
                    ⚠ No components yet —{' '}
                    <Link href={`/settings/templates/${t.id}`} className="underline">add components</Link>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card py-16 flex flex-col items-center text-center">
          <FileSliders size={40} className="text-surface-200 mb-4" />
          <h3 className="font-semibold text-ink mb-1">No templates yet</h3>
          <p className="text-sm text-ink-muted mb-6 max-w-xs">
            Create your first assessment template to define how scores are structured for your school.
          </p>
          <Link href="/settings/templates/new" className="btn-primary btn">
            <Plus size={14} /> Create first template
          </Link>
        </div>
      )}
    </div>
  )
}
