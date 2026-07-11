import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, MessageSquare, Pencil, ArrowLeft } from 'lucide-react'
import { deleteRemarkTemplate } from './actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function RemarkTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()
  const orgId = profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  const isAssigned = !!orgId && !isAdmin

  let templates: any[] = []

  if (orgId) {
    const { data } = await supabase
      .from('remark_templates')
      .select('id, type, min_score, max_score, remark_text')
      .eq('organization_id', orgId)
      .order('type').order('min_score', { ascending: false })
    templates = data || []
  } else {
    const { data } = await supabase
      .from('remark_templates')
      .select('id, type, min_score, max_score, remark_text')
      .is('organization_id', null)
      .eq('instructor_id', user.id)
      .order('type').order('min_score', { ascending: false })
    templates = data || []
  }

  const teacherTemplates = templates.filter(t => t.type === 'teacher')
  const principalTemplates = templates.filter(t => t.type === 'principal')

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Settings
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Remark Templates</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Remark Templates</h1>
          <p className="page-subtitle">
            Create ready-made remarks by performance range. Teachers can pick one when generating reports, or write a custom remark instead.
          </p>
        </div>
        {!isAssigned && (
          <Link href="/settings/remarks/new" className="btn-primary btn shrink-0">
            <Plus size={14} /> New remark
          </Link>
        )}
      </div>

      <RemarkSection
        title="Teacher Remarks"
        description="Shown to class teachers as suggestions for each student's report."
        templates={teacherTemplates}
        isAssigned={isAssigned}
      />

      <RemarkSection
        title="Principal / Head Teacher Remarks"
        description="Shown when the principal's comment is enabled on report cards."
        templates={principalTemplates}
        isAssigned={isAssigned}
      />
    </div>
  )
}

function RemarkSection({
  title, description, templates, isAssigned,
}: {
  title: string
  description: string
  templates: { id: string; min_score: number; max_score: number; remark_text: string }[]
  isAssigned: boolean
}) {
  return (
    <div className="card overflow-hidden">
      <div className="card-header">
        <h2 className="font-semibold text-sm text-ink">{title}</h2>
        <p className="text-xs text-ink-muted mt-0.5">{description}</p>
      </div>
      {templates.length > 0 ? (
        <div className="divide-y divide-surface-200">
          {templates.map(t => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 group">
              <div className="w-14 shrink-0">
                <span className="badge badge-gray font-mono text-[10px]">{t.min_score}–{t.max_score}%</span>
              </div>
              <p className="flex-1 text-sm text-ink">{t.remark_text}</p>
              {!isAssigned && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Link href={`/settings/remarks/${t.id}`} className="btn-secondary btn-sm btn">
                    <Pencil size={12} /> Edit
                  </Link>
                  <form action={deleteRemarkTemplate}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="btn btn-sm text-red-600 hover:bg-red-50 border border-red-200">
                      Remove
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <MessageSquare size={28} className="text-surface-200 mx-auto mb-2" />
          <p className="text-xs text-ink-faint">No remarks yet for this range.</p>
        </div>
      )}
    </div>
  )
}