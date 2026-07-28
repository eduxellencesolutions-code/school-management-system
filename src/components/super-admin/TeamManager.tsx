'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, Sparkles, ShieldOff, ShieldCheck } from 'lucide-react'

interface Staff { id: string; email: string; full_name: string; status: string; roleName: string }
interface Role { id: string; name: string }

export default function TeamManager() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleId, setRoleId] = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/platform-staff')
    const data = await res.json()
    if (data.error) setError(data.error)
    else { setStaff(data.staff ?? []); setRoles(data.roles ?? []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function seedRoles() {
    const res = await fetch('/api/platform-staff/seed-roles', { method: 'POST' })
    const data = await res.json()
    if (data.success) load()
    else setError(data.error)
  }

  async function invite() {
    if (!email || !fullName || !roleId) return
    const res = await fetch('/api/platform-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, fullName, roleId }),
    })
    const data = await res.json()
    if (data.success) { setEmail(''); setFullName(''); setRoleId(''); setShowForm(false); load() }
    else setError(data.error)
  }

  async function setStatus(id: string, status: string) {
    const reason = status !== 'active' ? prompt('Reason?') : null
    const res = await fetch(`/api/platform-staff/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason }),
    })
    const data = await res.json()
    if (data.success) load()
    else setError(data.error)
  }

  if (loading) return <div className="p-8 text-center flex items-center justify-center gap-2"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="card p-4 text-sm text-red-600 bg-red-50">{error}</div>}

      <div className="flex gap-2">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm btn flex items-center gap-1.5"><Plus size={14} /> Invite Staff</button>
        {roles.length === 0 && (
          <button onClick={seedRoles} className="btn-secondary btn-sm btn flex items-center gap-1.5"><Sparkles size={14} /> Use Suggested Roles</button>
        )}
      </div>

      {showForm && (
        <div className="card p-5 flex flex-col gap-3 max-w-md">
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          <input type="text" placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          <select value={roleId} onChange={e => setRoleId(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">Select role...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={invite} className="btn-primary btn-sm btn w-fit">Send Invite</button>
        </div>
      )}

      <div className="card divide-y divide-surface-100">
        {staff.length === 0 ? <p className="p-6 text-sm text-ink-muted text-center">No platform staff yet.</p> : staff.map(s => (
          <div key={s.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{s.full_name} <span className="text-xs text-ink-faint">({s.email})</span></p>
              <p className="text-xs text-ink-faint">{s.roleName} · <span className={s.status === 'active' ? 'text-green-600' : 'text-red-600'}>{s.status}</span></p>
            </div>
            {s.status === 'active' ? (
              <button onClick={() => setStatus(s.id, 'suspended')} className="btn-sm btn bg-red-50 text-red-600 flex items-center gap-1"><ShieldOff size={13} /> Suspend</button>
            ) : (
              <button onClick={() => setStatus(s.id, 'active')} className="btn-sm btn bg-green-50 text-green-600 flex items-center gap-1"><ShieldCheck size={13} /> Reactivate</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}