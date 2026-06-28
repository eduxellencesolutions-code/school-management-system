'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, AlertCircle } from 'lucide-react'

interface Component {
  name: string
  max_score: string
  pass_mark: string
}

interface Props {
  action: (formData: FormData) => Promise<void>
  templateId?: string
  defaultName?: string
  defaultDescription?: string
  defaultIsDefault?: boolean
  defaultComponents?: Component[]
  submitLabel?: string
}

const PRESETS = [
  {
    label: 'Primary (CA1+CA2+Exam)',
    components: [
      { name: 'CA 1', max_score: '20', pass_mark: '8' },
      { name: 'CA 2', max_score: '20', pass_mark: '8' },
      { name: 'Exam', max_score: '60', pass_mark: '24' },
    ],
  },
  {
    label: 'Four-component (Test×2+Mid+Final)',
    components: [
      { name: 'Test 1',    max_score: '10', pass_mark: '4' },
      { name: 'Test 2',    max_score: '10', pass_mark: '4' },
      { name: 'Mid-term',  max_score: '30', pass_mark: '12' },
      { name: 'Final',     max_score: '50', pass_mark: '20' },
    ],
  },
  {
    label: 'Simple (Exam only)',
    components: [
      { name: 'Exam', max_score: '100', pass_mark: '40' },
    ],
  },
]

export default function TemplateBuilder({
  action,
  templateId,
  defaultName = '',
  defaultDescription = '',
  defaultIsDefault = false,
  defaultComponents = [{ name: '', max_score: '', pass_mark: '' }],
  submitLabel = 'Save template',
}: Props) {
  const [components, setComponents] = useState<Component[]>(defaultComponents)
  const [submitting, setSubmitting] = useState(false)

  const total = components.reduce((sum, c) => sum + (parseFloat(c.max_score) || 0), 0)
  const totalOk = total === 100

  function addComponent() {
    setComponents(prev => [...prev, { name: '', max_score: '', pass_mark: '' }])
  }

  function removeComponent(i: number) {
    setComponents(prev => prev.filter((_, idx) => idx !== i))
  }

  function updateComponent(i: number, field: keyof Component, value: string) {
    setComponents(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    if (components.some(c => c.name) &&
      !confirm('Replace current components with this preset?')) return
    setComponents(preset.components)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    const fd = new FormData(e.currentTarget)
    // Inject dynamic components
    fd.delete('component_name')
    fd.delete('component_max_score')
    fd.delete('component_pass_mark')
    components.forEach(c => {
      fd.append('component_name', c.name)
      fd.append('component_max_score', c.max_score)
      fd.append('component_pass_mark', c.pass_mark)
    })
    await action(fd)
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {templateId && <input type="hidden" name="id" value={templateId} />}

      {/* Template info */}
      <div className="card p-5 flex flex-col gap-4">
        <h2 className="font-semibold text-sm text-ink">Template details</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">
              Template name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              defaultValue={defaultName}
              required
              placeholder="e.g. Primary Term Assessment"
              className="input"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Description (optional)</label>
            <input
              name="description"
              defaultValue={defaultDescription}
              placeholder="e.g. For Primary 1–6"
              className="input"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={defaultIsDefault}
            className="w-4 h-4 rounded border-surface-300 text-brand-500"
          />
          <span className="text-sm text-ink">Set as default template for new subjects</span>
        </label>
      </div>

      {/* Components */}
      <div className="card overflow-hidden">
        <div className="card-header flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-sm text-ink">Assessment components</h2>
            <p className="text-xs text-ink-muted mt-0.5">Define each scored component and its maximum marks</p>
          </div>
          <div className="flex gap-2">
            {/* Preset picker */}
            <select
              className="input text-xs py-1.5 max-w-[180px]"
              onChange={e => {
                const preset = PRESETS[parseInt(e.target.value)]
                if (preset) applyPreset(preset)
                e.target.value = ''
              }}
              defaultValue=""
            >
              <option value="" disabled>Load a preset…</option>
              {PRESETS.map((p, i) => (
                <option key={i} value={i}>{p.label}</option>
              ))}
            </select>
            <button type="button" onClick={addComponent} className="btn-secondary btn-sm btn">
              <Plus size={13} /> Add row
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider w-8">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider">Component name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider w-32">Max score</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase tracking-wider w-32">Pass mark</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b border-surface-200">
                  <td className="px-4 py-2 text-xs text-ink-muted">{i + 1}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={c.name}
                      onChange={e => updateComponent(i, 'name', e.target.value)}
                      placeholder="e.g. CA 1"
                      className="input py-1.5 text-sm"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={c.max_score}
                      onChange={e => updateComponent(i, 'max_score', e.target.value)}
                      placeholder="e.g. 20"
                      min={1}
                      max={1000}
                      className="input py-1.5 text-sm font-mono"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={c.pass_mark}
                      onChange={e => updateComponent(i, 'pass_mark', e.target.value)}
                      placeholder="e.g. 8"
                      min={0}
                      className="input py-1.5 text-sm font-mono"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeComponent(i)}
                      disabled={components.length === 1}
                      className="p-1.5 rounded text-ink-faint hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-50 border-t-2 border-surface-200">
                <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Total</td>
                <td className="px-4 py-2.5">
                  <span className={`text-sm font-bold font-mono ${totalOk ? 'text-green-600' : total > 0 ? 'text-amber-600' : 'text-ink-muted'}`}>
                    {total}
                  </span>
                  {total > 0 && !totalOk && (
                    <span className="text-xs text-amber-600 ml-1">(not 100)</span>
                  )}
                  {totalOk && <span className="text-xs text-green-600 ml-1">✓</span>}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>

        {total > 0 && !totalOk && (
          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700">
            <AlertCircle size={13} />
            Components add up to {total}, not 100. This is allowed but double-check your values.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || components.length === 0}
          className="btn-primary btn"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
        <a href="/settings/templates" className="btn-secondary btn">Cancel</a>
      </div>
    </form>
  )
}
