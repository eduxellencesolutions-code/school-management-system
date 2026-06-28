import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TemplateBuilder from '@/components/settings/TemplateBuilder'
import { updateTemplate } from '../actions'

interface Props { params: Promise<{ id: string }> }

export default async function EditTemplatePage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('assessment_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (!template) notFound()

  const { data: components } = await supabase
    .from('assessment_components')
    .select('name, max_score, pass_mark, sequence')
    .eq('template_id', id)
    .order('sequence')

  const defaultComponents = (components ?? []).map(c => ({
    name: c.name,
    max_score: String(c.max_score),
    pass_mark: String(c.pass_mark ?? ''),
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/templates" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Templates
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Edit — {template.name}</span>
      </div>

      <div>
        <h1 className="page-title">Edit template</h1>
        <p className="page-subtitle">
          Changes apply to all subjects using this template immediately.
        </p>
      </div>

      <TemplateBuilder
        action={updateTemplate}
        templateId={id}
        defaultName={template.name}
        defaultDescription={template.description ?? ''}
        defaultIsDefault={template.is_default}
        defaultComponents={
          defaultComponents.length > 0
            ? defaultComponents
            : [{ name: '', max_score: '', pass_mark: '' }]
        }
        submitLabel="Save changes"
      />
    </div>
  )
}
