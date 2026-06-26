'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Plus, Trash2, ChevronDown, ChevronUp, Star } from 'lucide-react'

interface Component { id: string; name: string; max_score: number; sequence: number; weight?: number }
interface Template  { id: string; name: string; description?: string; is_default: boolean; components: Component[] }
interface Props     { orgId: string; templates: Template[] }

export default function TemplateManager({ orgId, templates }: Props) {
  const supabase = createClient()
  const router   = useRouter()
  const [expanded, setExpanded] = useState<string | null>(templates[0]?.id ?? null)
  const [adding, setAdding]     = useState(false)
  const [loading, setLoading]   = useState(false)

  // New template form state
  const [tName, setTName]        = useState('')
  const [tDesc, setTDesc]        = useState('')
  const [components, setComponents] = useState([
    { name: 'CA 1', max_score: 20 },
    { name: 'CA 2', max_score: 20 },
    { name: 'Exam', max_score: 60 },
  ])

  function addComponent() {
    setComponents(prev => [...prev, { name: '', max_score: 0 }])
  }
  function removeComponent(i: number) {
    setComponents(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateComponent(i: number, field: 'name' | 'max_score', value: string | number) {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  const totalMax = components.reduce((sum, c) => sum + (Number(c.max_score) || 0), 0)

  async function saveTemplate() {
    if (!tName.trim()) { toast.error('Template name is required'); return }
    if (components.some(c => !c.name.trim())) { toast.error('All components need a name'); return }
    if (totalMax === 0) { toast.error('Total max score cannot be zero'); return }

    setLoading(true)
    const { data: tmpl, error: tErr } = await supabase
      .from('assessment_templates')
      .insert({ organization_id: orgId, name: tName.trim(), description: tDesc.trim() || null, is_default: templates.length === 0 })
      .select().single()

    if (tErr || !tmpl) { toast.error('Failed to create template'); setLoading(false); return }

    const { error: cErr } = await supabase.from('assessment_components').insert(
      components.map((c, i) => ({
        template_id: tmpl.id,
        name: c.name.trim(),
        max_score: Number(c.max_score),
        sequence: i + 1,
      }))
    )

    if (cErr) { toast.error('Failed to save components'); setLoading(false); return }

    toast.success(`Template "${tName}" created`)
    setAdding(false)
    setTName(''); setTDesc('')
    setComponents([{ name: 'CA 1', max_score: 20 }, { name: 'CA 2', max_score: 20 }, { name: 'Exam', max_score: 60 }])
    router.refresh()
    setLoading(false)
  }

  async function setDefault(id: string) {
    await supabase.from('assessment_templates').update({ is_default: false }).eq('organization_id', orgId)
    await supabase.from('assessment_templates').update({ is_default: true }).eq('id', id)
    toast.success('Default template updated')
    router.refresh()
  }

  async function deleteTemplate(id: string, name: string) {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return
    const { error } = await supabase.from('assessment_templates').delete().eq('id', id)
    if (error) toast.error('Failed to delete template')
    else { toast.success('Template deleted'); router.refresh() }
  }

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm text-ink">Assessment Templates</h2>
          <p className="text-xs text-ink-muted mt-0.5">Define components like CA 1, CA 2, and Exam for each subject</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-primary btn-sm btn">
            <Plus size={13} /> New template
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="border-b border-surface-200 p-5 bg-brand-50 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-brand-700">New template</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Template name *</label>
              <input className="input" placeholder="e.g. Primary School" value={tName} onChange={e => setTName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Description</label>
              <input className="input" placeholder="Optional" value={tDesc} onChange={e => setTDesc(e.target.value)} />
            </div>
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-ink">Components</label>
              <span className={`text-xs font-mono font-semibold ${totalMax === 100 ? 'text-green-600' : 'text-amber-600'}`}>
                Total: {totalMax}/100
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {components.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-ink-muted w-4">{i + 1}.</span>
                  <input
                    className="input flex-1"
                    placeholder="Component name"
                    value={c.name}
                    onChange={e => updateComponent(i, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    className="input w-20 text-center font-mono"
                    placeholder="Max"
                    value={c.max_score}
                    onChange={e => updateComponent(i, 'max_score', e.target.value)}
                    min={1} max={100}
                  />
                  <button onClick={() => removeComponent(i)} className="p-1.5 text-ink-faint hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <button onClick={addComponent} className="btn-secondary btn-sm btn self-start">
                <Plus size={12} /> Add component
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={saveTemplate} disabled={loading} className="btn-primary btn-sm btn">
              {loading ? 'Saving…' : 'Save template'}
            </button>
            <button onClick={() => setAdding(false)} className="btn-secondary btn-sm btn">Cancel</button>
          </div>
        </div>
      )}

      {/* Template list */}
      <div className="divide-y divide-surface-200">
        {templates.length === 0 && !adding && (
          <div className="p-8 text-center text-sm text-ink-muted">
            No templates yet. Create one to define CA and Exam components for your subjects.
          </div>
        )}
        {templates.map(t => (
          <div key={t.id}>
            <div
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-50 cursor-pointer transition-colors"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              {t.is_default && <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />}
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{t.name}</p>
                {t.description && <p className="text-xs text-ink-muted">{t.description}</p>}
              </div>
              <span className="text-xs text-ink-faint">{t.components.length} components</span>
              {expanded === t.id ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
            </div>

            {expanded === t.id && (
              <div className="px-5 pb-4 border-t border-surface-100 bg-surface-50">
                <div className="mt-3 flex flex-col gap-1">
                  {[...t.components].sort((a, b) => a.sequence - b.sequence).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm py-1.5 border-b border-surface-200 last:border-0">
                      <span className="text-ink">{c.name}</span>
                      <span className="font-mono text-ink-muted">/{c.max_score}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-sm pt-2 font-semibold">
                    <span className="text-ink">Total</span>
                    <span className="font-mono text-ink">/{t.components.reduce((s, c) => s + c.max_score, 0)}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {!t.is_default && (
                    <button onClick={() => setDefault(t.id)} className="btn-secondary btn-sm btn">
                      <Star size={12} /> Set as default
                    </button>
                  )}
                  <button onClick={() => deleteTemplate(t.id, t.name)} className="btn-ghost btn-sm btn text-red-500 hover:bg-red-50">
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
