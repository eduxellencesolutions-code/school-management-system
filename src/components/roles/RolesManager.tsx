'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, ChevronDown, ChevronUp, Sparkles, UserPlus, X } from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
  is_system_default: boolean
  permissions: string[]
  staffCount: number
}

interface Permission {
  key: string
  category: string
  label: string
  description: string | null
}

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  assignedRoles: Array<{ assignmentId: string; roleId: string; roleName: string }>
}

const PERMISSION_CATALOG: Permission[] = [
  { key: 'fees.view', category: 'Fees', label: 'View fee accounts', description: null },
  { key: 'fees.record_payment', category: 'Fees', label: 'Record payments', description: null },
  { key: 'fees.manage_structures', category: 'Fees', label: 'Manage fee structures', description: null },
  { key: 'fees.void_payment', category: 'Fees', label: 'Void payments', description: null },
  { key: 'results.view', category: 'Results', label: 'View results', description: null },
  { key: 'results.enter_scores', category: 'Results', label: 'Enter scores', description: null },
  { key: 'results.review_completeness', category: 'Results', label: 'Review completeness', description: null },
  { key: 'results.lock', category: 'Results', label: 'Lock results', description: null },
  { key: 'results.generate_reports', category: 'Results', label: 'Generate reports', description: null },
  { key: 'promotion.view', category: 'Promotion', label: 'View promotion data', description: null },
  { key: 'promotion.confirm', category: 'Promotion', label: 'Confirm promotion', description: null },
  { key: 'promotion.configure_rules', category: 'Promotion', label: 'Configure promotion rules', description: null },
  { key: 'attendance.view', category: 'Attendance', label: 'View attendance', description: null },
  { key: 'attendance.mark', category: 'Attendance', label: 'Mark attendance', description: null },
  { key: 'students.view', category: 'Students', label: 'View students', description: null },
  { key: 'students.manage', category: 'Students', label: 'Manage students', description: null },
  { key: 'students.admit', category: 'Students', label: 'Admit students', description: null },
  { key: 'staff.view', category: 'Staff', label: 'View staff', description: null },
  { key: 'staff.manage', category: 'Staff', label: 'Manage staff', description: null },
  { key: 'staff.manage_roles', category: 'Staff', label: 'Manage roles & permissions', description: null },
  { key: 'parents.view', category: 'Parents', label: 'View parents', description: null },
  { key: 'parents.manage_access', category: 'Parents', label: 'Manage parent access', description: null },
  { key: 'announcements.view', category: 'Announcements', label: 'View announcements', description: null },
  { key: 'announcements.post', category: 'Announcements', label: 'Post announcements', description: null },
]

const CATEGORIES = [...new Set(PERMISSION_CATALOG.map((p) => p.category))]

export default function RolesManager() {
  const [roles, setRoles] = useState<Role[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null)
  const [showNewRoleForm, setShowNewRoleForm] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [seeding, setSeeding] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [rolesRes, staffRes] = await Promise.all([
      fetch('/api/admin/roles').then((r) => r.json()),
      fetch('/api/admin/staff').then((r) => r.json()),
    ])
    if (rolesRes.error) setError(rolesRes.error)
    else setRoles(rolesRes.roles ?? [])
    if (!staffRes.error) setStaff(staffRes.staff ?? [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function seedDefaults() {
    setSeeding(true)
    const res = await fetch('/api/admin/roles/seed-defaults', { method: 'POST' })
    const data = await res.json()
    if (data.success) await loadAll()
    else setError(data.error ?? 'Failed to seed default roles.')
    setSeeding(false)
  }

  async function createRole() {
    if (!newRoleName) return
    const res = await fetch('/api/admin/roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName, description: newRoleDesc || null }),
    })
    const data = await res.json()
    if (data.success) {
      setNewRoleName(''); setNewRoleDesc(''); setShowNewRoleForm(false)
      await loadAll()
    } else {
      setError(data.error ?? 'Failed to create role.')
    }
  }

  async function togglePermission(roleId: string, permissionKey: string, currentlyEnabled: boolean) {
    setRoles((prev) => prev.map((r) => r.id === roleId
      ? { ...r, permissions: currentlyEnabled ? r.permissions.filter((p) => p !== permissionKey) : [...r.permissions, permissionKey] }
      : r
    ))
    const res = await fetch(`/api/admin/roles/${roleId}/permissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionKey, enabled: !currentlyEnabled }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      loadAll() // revert on failure
    }
  }

  async function assignRole(userId: string, roleId: string) {
    if (!roleId) return
    const res = await fetch('/api/admin/staff/assign-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, roleId }),
    })
    const data = await res.json()
    if (data.success) await loadAll()
    else setError(data.error ?? 'Failed to assign role.')
  }

  async function unassignRole(assignmentId: string) {
    const res = await fetch(`/api/admin/staff/assign-role?assignmentId=${assignmentId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) await loadAll()
    else setError(data.error ?? 'Failed to remove role.')
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-ink-muted flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading...</div>
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="card p-4 text-sm text-red-600 bg-red-50 border-red-100">{error}</div>}

      <div className="flex gap-2">
        <button onClick={() => setShowNewRoleForm(!showNewRoleForm)} className="btn-primary btn-sm btn flex items-center gap-1.5">
          <Plus size={14} /> New Role
        </button>
        {roles.length === 0 && (
          <button onClick={seedDefaults} disabled={seeding} className="btn-secondary btn-sm btn flex items-center gap-1.5">
            <Sparkles size={14} /> {seeding ? 'Setting up...' : 'Use Suggested Roles'}
          </button>
        )}
      </div>

      {showNewRoleForm && (
        <div className="card p-5 flex flex-col gap-3 max-w-md">
          <input type="text" placeholder="Role name (e.g. Sports Coordinator)" value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)} className="border border-surface-200 rounded px-3 py-2 text-sm" />
          <input type="text" placeholder="Description (optional)" value={newRoleDesc}
            onChange={(e) => setNewRoleDesc(e.target.value)} className="border border-surface-200 rounded px-3 py-2 text-sm" />
          <button onClick={createRole} className="btn-primary btn-sm btn w-fit">Create Role</button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {roles.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-muted">
            No roles yet. Create one, or use the suggested defaults above.
          </div>
        ) : roles.map((role) => (
          <div key={role.id} className="card">
            <button onClick={() => setExpandedRoleId(expandedRoleId === role.id ? null : role.id)}
              className="w-full flex items-center justify-between px-5 py-3 text-left">
              <div>
                <p className="text-sm font-semibold text-ink flex items-center gap-2">
                  {role.name}
                  {role.is_system_default && <span className="badge badge-gray text-[9px]">Suggested</span>}
                </p>
                <p className="text-xs text-ink-faint">{role.description ?? 'No description'} · {role.staffCount} staff · {role.permissions.length} permissions</p>
              </div>
              {expandedRoleId === role.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {expandedRoleId === role.id && (
              <div className="px-5 pb-5 border-t border-surface-100 pt-4 flex flex-col gap-4">
                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-2">Permissions</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => (
                      <div key={cat} className="border border-surface-200 rounded p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-2">{cat}</p>
                        {PERMISSION_CATALOG.filter((p) => p.category === cat).map((p) => {
                          const enabled = role.permissions.includes(p.key)
                          return (
                            <label key={p.key} className="flex items-center gap-2 py-1 cursor-pointer">
                              <input type="checkbox" checked={enabled} onChange={() => togglePermission(role.id, p.key, enabled)} className="w-3.5 h-3.5" />
                              <span className="text-xs text-ink">{p.label}</span>
                            </label>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-ink-muted mb-2">Assign Staff</p>
                  <div className="flex flex-col gap-1.5">
                    {staff.map((s) => {
                      const assignment = s.assignedRoles.find((ar) => ar.roleId === role.id)
                      return (
                        <div key={s.id} className="flex items-center justify-between text-sm">
                          <span className="text-ink">{s.name} <span className="text-xs text-ink-faint">({s.email})</span></span>
                          {assignment ? (
                            <button onClick={() => unassignRole(assignment.assignmentId)} className="text-xs text-red-600 hover:underline flex items-center gap-1">
                              <X size={12} /> Remove
                            </button>
                          ) : (
                            <button onClick={() => assignRole(s.id, role.id)} className="text-xs text-brand-500 hover:underline flex items-center gap-1">
                              <UserPlus size={12} /> Assign
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}