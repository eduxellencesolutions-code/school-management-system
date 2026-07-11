import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateRemarkTemplate } from '../actions'

interface Props { params: Promise<{ id: string }> }

export default async function EditRemarkTemplatePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: template } = await supabase
    .from('remark_templates').select('*').eq('id', id).single()

  if (!template) notFound()

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/settings/remarks" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Remark Templates
        </Link>
        <span className="text-ink-faint">/</span>
        <span className="text-ink font-medium">Edit</span>
      </div>

      <div>
        <h1 className="page-title">Edit remark template</h1>
      </div>

      <form action={updateRemarkTemplate} className="card p-5 flex flex-col gap-4">
        <input type="hidden" name="id" value={template.id} />

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Remark type <span className="text-red-500">*</span></label>
          <select name="type" required className="input" defaultValue={template.type}>
            <option value="teacher">Teacher remark</option>
            <option value="principal">Principal / Head Teacher remark</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Min score (%) <span className="text-red-500">*</span></label>
            <input name="min_score" type="number" min={0} max={100} step="0.1" required className="input" defaultValue={template.min_score} />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Max score (%) <span className="text-red-500">*</span></label>
            <input name="max_score" type="number" min={0} max={100} step="0.1" required className="input" defaultValue={template.max_score} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1">Remark text <span className="text-red-500">*</span></label>
          <textarea name="remark_text" required rows={3} className="input" defaultValue={template.remark_text} />
        </div>

        <div className="flex gap-2 pt-1">
          <button type="submit" className="btn-primary btn">Save changes</button>
          <Link href="/settings/remarks" className="btn-secondary btn">Cancel</Link>
        </div>
      </form>
    </div>
  )
}