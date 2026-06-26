'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Trash2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

interface Subject {
  id: string
  name: string
  code?: string
  template_id?: string
  instructor: { name: string } | null
}
interface Template { id: string; name: string }

interface Props {
  groupId: string
  subjects: Subject[]
  templates: Template[]
}

export default function SubjectManager({ groupId, subjects, templates }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')

  async function addSubject() {
    if (!name.trim()) { toast.error('Subject name is required'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()

    const { error } = await supabase.from('subjects').insert({
      organization_id: profile?.organization_id,
      group_id: groupId,
      name: name.trim(),
      code: code.trim() || null,
      template_id: templateId || null,
      is_active: true,
    })

    if (error) {
      toast.error('Failed to add subject')
    } else {
      toast.success(`${name} added`)
      setName('')
      setCode('')
      setAdding(false)
      router.refresh()
    }
    setLoading(false)
  }

  async function removeSubject(id: string, subjectName: string) {
    if (!confirm(`Remove "${subjectName}" from this class? Scores for this subject will be deleted.`)) return

    const { error } = await supabase
      .from('subjects')
      .update({ is_active: false })
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove subject')
    } else {
      toast.success(`${subjectName} removed`)
      router.refresh()
    }
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <h2 className="font-semibold text-sm text-ink">
          Subjects <span className="text-ink-faint font-normal">({subjects.length})</span>
        </h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary btn-sm btn">
            <Plus size={13} /> Add subject
          </button>
        )}
      </div>

      {/* Add subject form */}
      {adding && (
        <div className="border-b border-surface-200 px-5 py-4 bg-brand-50">
          <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">New subject</p>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Subject name *</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Mathematics"
                  className="input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addSubject()}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Code (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. MATH"
                  className="input font-mono"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                />
              </div>
            </div>

            {templates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-ink mb-1">Assessment template</label>
                <select
                  className="input"
                  value={templateId}
                  onChange={e => setTemplateId(e.target.value)}
                >
                  <option value="">No template (scores only)</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="text-xs text-ink-muted mt-1">
                  Templates define assessment components (CA1, CA2, Exam…).{' '}
                  <Link href="/settings?tab=templates" className="text-brand-500 hover:underline">Manage templates →</Link>
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={addSubject} disabled={loading} className="btn-primary btn-sm btn">
                {loading ? 'Adding…' : 'Add subject'}
              </button>
              <button onClick={() => { setAdding(false); setName(''); setCode('') }} className="btn-secondary btn-sm btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subject list */}
      <div className="divide-y divide-surface-200">
        {subjects.length > 0 ? (
          subjects.map((s) => {
            const instructor = s.instructor as { name: string } | null
            return (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50 transition-colors group">
                <div className="w-8 h-8 rounded bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    {s.code && <span className="badge badge-gray font-mono text-[10px]">{s.code}</span>}
                    {s.template_id && <span className="badge badge-blue text-[10px]">template</span>}
                  </div>
                  {instructor && (
                    <p className="text-xs text-ink-muted">{instructor.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/scores?class=${groupId}&subject=${s.id}`}
                    className="btn-secondary btn-sm btn text-xs"
                  >
                    Scores
                  </Link>
                  <button
                    onClick={() => removeSubject(s.id, s.name)}
                    className="p-1.5 rounded text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remove subject"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-5 py-10 text-center">
            <BookOpen size={28} className="text-surface-200 mx-auto mb-2" />
            <p className="text-sm text-ink-muted mb-1">No subjects added</p>
            <p className="text-xs text-ink-faint">Add subjects to start entering scores</p>
          </div>
        )}
      </div>
    </div>
  )
}
