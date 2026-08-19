'use client'
import { useEffect, useState } from 'react'

export default function CategoryManager({ onChange }: { onChange?: () => void }) {
  const [categories, setCategories] = useState<any[]>([])
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    const res = await fetch('/api/platform-staff/resource-categories')
    const json = await res.json()
    setCategories(json.categories ?? [])
  }
  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!key || !label) { setError('Key and label are required'); return }
    setSaving(true)
    setError(null)
    const res = await fetch('/api/platform-staff/resource-categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label, icon: icon || null }),
    })
    const json = await res.json()
    if (json.error) setError(json.error)
    else {
      setKey(''); setLabel(''); setIcon('')
      await load()
      onChange?.()
    }
    setSaving(false)
  }

  return (
    <div className="card p-4">
      <button onClick={() => setOpen(o => !o)} className="text-sm font-semibold text-ink">
        📁 Manage Categories {open ? '▲' : '▼'}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className="text-xs bg-surface-100 px-2 py-1 rounded-full">
                {c.icon ? `${c.icon} ` : ''}{c.label}
              </span>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-2">
            <input placeholder="key (e.g. sales_business_dev)" value={key} onChange={e => setKey(e.target.value)} className="border rounded px-2 py-1 text-xs flex-1" />
            <input placeholder="Label (e.g. Sales & Business Development)" value={label} onChange={e => setLabel(e.target.value)} className="border rounded px-2 py-1 text-xs flex-1" />
            <input placeholder="Icon (emoji, optional)" value={icon} onChange={e => setIcon(e.target.value)} className="border rounded px-2 py-1 text-xs w-24" />
            <button onClick={handleAdd} disabled={saving} className="btn-primary btn-sm btn text-xs disabled:opacity-50">
              {saving ? 'Adding…' : '+ Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}