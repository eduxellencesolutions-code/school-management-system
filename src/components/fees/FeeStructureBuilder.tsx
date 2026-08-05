'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, ChevronDown, ChevronUp, Trash2, Lock } from 'lucide-react'

interface Term { id: string; name: string; sessionName: string }
interface Group { id: string; name: string }
interface Category { id: string; name: string }
interface StructureItem {
  id: string
  description: string
  amount: number
  dueDate: string | null
  isMandatory: boolean
  categoryId: string
  categoryName: string
}
interface Structure {
  id: string
  name: string
  groupId: string | null
  groupName: string
  termId: string
  termName: string | null
  sessionName: string | null
  createdAt: string
  items: StructureItem[]
  totalAmount: number
  hasBeenIssued: boolean
}

export default function FeeStructureBuilder({
  terms,
  groups,
  categories,
  defaultTermId,
}: {
  terms: Term[]
  groups: Group[]
  categories: Category[]
  defaultTermId: string | null
}) {
  const [structures, setStructures] = useState<Structure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newTermId, setNewTermId] = useState(defaultTermId ?? terms[0]?.id ?? '')
  const [newGroupId, setNewGroupId] = useState('')
  const [creating, setCreating] = useState(false)

  type ItemForm = { categoryId: string; description: string; amount: string; dueDate: string }
  const [itemForms, setItemForms] = useState<Record<string, ItemForm>>({})
  const [savingItem, setSavingItem] = useState<string | null>(null)

  async function loadStructures() {
    setLoading(true)
    const res = await fetch('/api/admin/finance/fee-structures')
    const data = await res.json()
    if (data.error) setError(data.error)
    else setStructures(data.structures ?? [])
    setLoading(false)
  }

  useEffect(() => { loadStructures() }, [])

  async function createStructure() {
    if (!newName || !newTermId) return
    setCreating(true)
    setError(null)
    const res = await fetch('/api/admin/finance/fee-structures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, termId: newTermId, groupId: newGroupId || null }),
    })
    const data = await res.json()
    if (data.success) {
      setNewName('')
      setNewGroupId('')
      setShowNewForm(false)
      await loadStructures()
      setExpandedId(data.structureId)
    } else {
      setError(data.error ?? 'Failed to create fee structure.')
    }
    setCreating(false)
  }

  async function deleteStructure(id: string) {
    if (!confirm('Delete this fee structure? This cannot be undone.')) return
    const res = await fetch(`/api/admin/finance/fee-structures/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) await loadStructures()
    else setError(data.error ?? 'Failed to delete fee structure.')
  }

  function getItemForm(structureId: string): ItemForm {
    return itemForms[structureId] ?? { categoryId: categories[0]?.id ?? '', description: '', amount: '', dueDate: '' }
  }

  function updateItemForm(structureId: string, patch: Partial<ItemForm>) {
    setItemForms((prev) => ({ ...prev, [structureId]: { ...getItemForm(structureId), ...patch } }))
  }

  async function addItem(structureId: string) {
    const form = getItemForm(structureId)
    if (!form.categoryId || !form.description || !form.amount) return
    setSavingItem(structureId)
    setError(null)
    const res = await fetch(`/api/admin/finance/fee-structures/${structureId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: form.categoryId,
        description: form.description,
        amount: Number(form.amount),
        dueDate: form.dueDate || null,
        isMandatory: true,
      }),
    })
    const data = await res.json()
    if (data.success) {
      setItemForms((prev) => ({ ...prev, [structureId]: { categoryId: categories[0]?.id ?? '', description: '', amount: '', dueDate: '' } }))
      await loadStructures()
    } else {
      setError(data.error ?? 'Failed to add line item.')
    }
    setSavingItem(null)
  }

  async function removeItem(structureId: string, itemId: string) {
    const res = await fetch(`/api/admin/finance/fee-structures/${structureId}/items?itemId=${itemId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) await loadStructures()
    else setError(data.error ?? 'Failed to remove line item.')
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      <div>
        <button onClick={() => setShowNewForm(!showNewForm)} className="btn-primary btn-sm btn flex items-center gap-1.5">
          <Plus size={14} /> New Fee Structure
        </button>
      </div>

      {showNewForm && (
        <div className="card p-5 flex flex-col gap-3 max-w-lg">
          <input
            type="text"
            placeholder="Structure name (e.g. JSS1 Term 1 Fees)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-surface-200 rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <select value={newTermId} onChange={(e) => setNewTermId(e.target.value)} className="flex-1 border border-surface-200 rounded px-2 py-1.5 text-sm">
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.sessionName} · {t.name}</option>
              ))}
            </select>
            <select value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)} className="flex-1 border border-surface-200 rounded px-2 py-1.5 text-sm">
              <option value="">All Classes</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <button onClick={createStructure} disabled={creating || !newName || !newTermId} className="btn-primary btn-sm btn w-fit">
            {creating ? 'Creating...' : 'Create Structure'}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {structures.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No fee structures yet. Create one to start issuing invoices.
          </div>
        ) : (
          structures.map((s) => (
            <div key={s.id} className="card">
              <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)} className="w-full flex items-center justify-between px-5 py-3 text-left">
                <div>
                  <p className="text-sm font-semibold text-ink flex items-center gap-2">
                    {s.name}
                    {s.hasBeenIssued && (
                      <span className="badge badge-gray text-[9px] flex items-center gap-1">
                        <Lock size={9} /> Issued
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {s.sessionName} · {s.termName} · {s.groupName} · {s.items.length} items · ₦{s.totalAmount.toLocaleString('en-NG')}
                  </p>
                </div>
                {expandedId === s.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </button>

              {expandedId === s.id && (
                <div className="px-5 pb-5 border-t border-surface-100 pt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    {s.items.length === 0 ? (
                      <p className="text-sm text-ink-muted">No line items yet.</p>
                    ) : (
                      s.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm border-b border-surface-100 py-1.5 last:border-0">
                          <span className="text-ink">
                            {item.description}{' '}
                            <span className="text-xs text-ink-faint">
                              ({item.categoryName}{item.dueDate ? ` · due ${new Date(item.dueDate).toLocaleDateString('en-NG')}` : ''})
                            </span>
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-ink">₦{item.amount.toLocaleString('en-NG')}</span>
                            {!s.hasBeenIssued && (
                              <button onClick={() => removeItem(s.id, item.id)} className="text-ink-faint hover:text-red-600" title="Remove item">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {!s.hasBeenIssued ? (
                    <div className="flex gap-2 flex-wrap items-end border-t border-surface-100 pt-3">
                      <select
                        value={getItemForm(s.id).categoryId}
                        onChange={(e) => updateItemForm(s.id, { categoryId: e.target.value })}
                        className="border border-surface-200 rounded px-2 py-1.5 text-sm"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Description (e.g. Tuition)"
                        value={getItemForm(s.id).description}
                        onChange={(e) => updateItemForm(s.id, { description: e.target.value })}
                        className="flex-1 min-w-[140px] border border-surface-200 rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={getItemForm(s.id).amount}
                        onChange={(e) => updateItemForm(s.id, { amount: e.target.value })}
                        className="w-28 border border-surface-200 rounded px-2 py-1.5 text-sm"
                      />
                      <input
                        type="date"
                        value={getItemForm(s.id).dueDate}
                        onChange={(e) => updateItemForm(s.id, { dueDate: e.target.value })}
                        className="border border-surface-200 rounded px-2 py-1.5 text-sm"
                      />
                      <button onClick={() => addItem(s.id)} disabled={savingItem === s.id} className="btn-secondary btn-sm btn flex items-center gap-1">
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-faint italic">
                      This structure has been issued to students and is now locked. Create a new structure for further changes.
                    </p>
                  )}

                  {!s.hasBeenIssued && s.items.length === 0 && (
                    <button onClick={() => deleteStructure(s.id)} className="text-xs text-red-600 hover:underline w-fit flex items-center gap-1">
                      <Trash2 size={12} /> Delete this structure
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}