'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Search, RefreshCw, Copy, Printer, ShieldOff, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'

interface Child {
  id: string
  name: string
  admissionNumber: string | null
  className: string | null
  relationship: string
}

interface Parent {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  accessCode: string | null
  accessCodeActive: boolean
  accessCodeRegeneratedAt: string | null
  createdAt: string
  children: Child[]
}

export default function ParentsTable() {
  const [parents, setParents] = useState<Parent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async (searchTerm: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/parents?search=${encodeURIComponent(searchTerm)}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setParents(data.parents ?? [])
      }
    } catch {
      setError('Could not load parents.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => load(search), 300)
    return () => clearTimeout(timeout)
  }, [search, load])

  async function regenerate(parentId: string) {
    setBusyId(parentId)
    const res = await fetch(`/api/admin/parents/${parentId}/regenerate`, { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      setParents((prev) =>
        prev.map((p) => (p.id === parentId ? { ...p, accessCode: data.newCode, accessCodeActive: true } : p))
      )
    } else {
      setError(data.error ?? 'Failed to regenerate code.')
    }
    setBusyId(null)
  }

  async function toggleActive(parentId: string, currentlyActive: boolean) {
    setBusyId(parentId)
    const res = await fetch(`/api/admin/parents/${parentId}/toggle-active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !currentlyActive }),
    })
    const data = await res.json()
    if (data.success) {
      setParents((prev) =>
        prev.map((p) => (p.id === parentId ? { ...p, accessCodeActive: data.active } : p))
      )
    } else {
      setError(data.error ?? 'Failed to update access.')
    }
    setBusyId(null)
  }

  function copyCode(parent: Parent) {
    navigator.clipboard.writeText(parent.accessCode ?? '')
    setCopiedId(parent.id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  function printSheet(parent: Parent) {
    const childrenList = parent.children.map((c) => `${c.name}${c.className ? ` (${c.className})` : ''}`).join(', ')
    const win = window.open('', '_blank', 'width=500,height=600')
    if (!win) return
    win.document.write(`
      <html>
        <head><title>Parent Access Instructions</title></head>
        <body style="font-family: sans-serif; padding: 32px; text-align: center;">
          <h2>Eduxellence Results — Parent Access</h2>
          <p><strong>Parent:</strong> ${parent.fullName}</p>
          <p><strong>Children:</strong> ${childrenList || '—'}</p>
          <div style="margin: 24px 0; padding: 16px; border: 2px solid #C8960C; border-radius: 8px; display: inline-block;">
            <p style="margin: 0; font-size: 12px; color: #666;">Your Access Code</p>
            <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; letter-spacing: 4px;">${parent.accessCode}</p>
          </div>
          <p>Visit <strong>results.eduxellence.org/access</strong> and enter this code to view your child's results.</p>
          <p style="font-size: 11px; color: #999;">Keep this code private. Contact the school if you need it regenerated.</p>
        </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  if (loading && parents.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading parents...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by parent, phone, email, or student name..."
          className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded text-sm"
        />
      </div>

      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      {parents.length === 0 && !loading && (
        <div className="card p-8 text-center text-sm text-ink-muted">No parents found.</div>
      )}

      <div className="flex flex-col gap-2">
        {parents.map((parent) => (
          <div key={parent.id} className="card">
            <button
              onClick={() => setExpandedId(expandedId === parent.id ? null : parent.id)}
              className="w-full flex items-center justify-between px-5 py-3 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{parent.fullName}</p>
                <p className="text-xs text-ink-faint">
                  {parent.email ?? '—'} {parent.phone && `• ${parent.phone}`} • {parent.children.length} child{parent.children.length !== 1 ? 'ren' : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge text-[10px] ${parent.accessCodeActive ? 'badge-green' : 'badge-gray'}`}>
                  {parent.accessCodeActive ? 'Active' : 'Revoked'}
                </span>
                {expandedId === parent.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </button>

            {expandedId === parent.id && (
              <div className="px-5 pb-4 border-t border-surface-100 pt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-2">Linked Children</p>
                  <div className="flex flex-col gap-1">
                    {parent.children.map((c) => (
                      <div key={c.id} className="text-sm text-ink flex items-center gap-2">
                        <span className="font-medium">{c.name}</span>
                        {c.className && <span className="text-xs text-ink-faint">({c.className})</span>}
                        {c.admissionNumber && <span className="text-xs text-ink-faint font-mono">{c.admissionNumber}</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 rounded border border-surface-200">
                    <span className="font-mono text-lg tracking-widest font-bold text-ink">
                      {parent.accessCode ?? '—'}
                    </span>
                    <button onClick={() => copyCode(parent)} className="text-ink-muted hover:text-ink" title="Copy code">
                      <Copy size={14} />
                    </button>
                    {copiedId === parent.id && <span className="text-xs text-green-600">Copied!</span>}
                  </div>

                  <button
                    onClick={() => printSheet(parent)}
                    className="btn-secondary btn-sm btn flex items-center gap-1.5"
                  >
                    <Printer size={13} /> Print instructions
                  </button>

                  <button
                    onClick={() => regenerate(parent.id)}
                    disabled={busyId === parent.id}
                    className="btn-secondary btn-sm btn flex items-center gap-1.5"
                  >
                    <RefreshCw size={13} /> Regenerate code
                  </button>

                  <button
                    onClick={() => toggleActive(parent.id, parent.accessCodeActive)}
                    disabled={busyId === parent.id}
                    className={`btn-sm btn flex items-center gap-1.5 ${
                      parent.accessCodeActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                    }`}
                  >
                    {parent.accessCodeActive ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                    {parent.accessCodeActive ? 'Revoke access' : 'Reactivate access'}
                  </button>
                </div>

                {parent.accessCodeRegeneratedAt && (
                  <p className="text-[10px] text-ink-faint">
                    Code last regenerated {new Date(parent.accessCodeRegeneratedAt).toLocaleDateString('en-NG')}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
