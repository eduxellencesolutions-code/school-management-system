'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Loader2, Lock, Unlock, X, Shield, Building2, Handshake, UsersRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { lockAccount, unlockAccount, forcePasswordReset, regenerateParentAccessCode, setParentPortalAccess, revokeSessions } from '@/app/(super-admin)/security/actions'

interface UserRow {
  id: string
  name: string
  email: string
  phone: string | null
  primaryType: string
  orgLabel: string
  accountStatus: string
  plan: string | null
  lastLogin: string | null
  badges: { representative: boolean; platformStaff: boolean; parent: boolean; multiRole: boolean }
}

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  locked: 'bg-red-100 text-red-800',
  suspended: 'bg-amber-100 text-amber-800',
}

export default function PlatformUsersDirectory({ 
  canManageLocks, 
  canForceReset, 
  canManageParentAccess,
  canRevokeSessions
}: { 
  canManageLocks: boolean; 
  canForceReset: boolean; 
  canManageParentAccess: boolean;
  canRevokeSessions: boolean;
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [lockReason, setLockReason] = useState('')
  const [resetReason, setResetReason] = useState('')
  const [parentActionReason, setParentActionReason] = useState('')
  const [revokeReason, setRevokeReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [isDefaultList, setIsDefaultList] = useState(true)

  const runSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/platform-users/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data.users ?? [])
      setIsDefaultList(data.isDefaultList ?? false)
    } catch {
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    runSearch('')
  }, [runSearch])

  function handleQueryChange(v: string) {
    setQuery(v)
    runSearch(v)
  }

  async function openDrawer(id: string) {
    setSelectedId(id)
    setDetail(null)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/platform-users/${id}`)
      const data = await res.json()
      setDetail(data)
    } catch {
      toast.error('Failed to load user detail')
    } finally {
      setDetailLoading(false)
    }
  }

  function closeDrawer() {
    setSelectedId(null)
    setDetail(null)
    setLockReason('')
    setResetReason('')
    setParentActionReason('')
    setRevokeReason('')
  }

  async function handleLock() {
    if (!selectedId) return
    if (!lockReason.trim()) { toast.error('A reason is required'); return }
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    fd.append('reason', lockReason)
    const result = await lockAccount(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('Account locked')
    setLockReason('')
    openDrawer(selectedId)
    runSearch(query)
  }

  async function handleUnlock() {
    if (!selectedId) return
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    const result = await unlockAccount(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('Account unlocked')
    openDrawer(selectedId)
    runSearch(query)
  }

  async function handleForceReset() {
    if (!selectedId) return
    if (!resetReason.trim()) { toast.error('A reason is required'); return }
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    fd.append('reason', resetReason)
    const result = await forcePasswordReset(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(result.message || 'Reset email sent')
    setResetReason('')
  }

  async function handleRegenerateCode() {
    if (!selectedId) return
    if (!parentActionReason.trim()) { toast.error('A reason is required'); return }
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    fd.append('reason', parentActionReason)
    const result = await regenerateParentAccessCode(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(result.message || 'Code regenerated')
    setParentActionReason('')
    openDrawer(selectedId)
  }

  async function handleTogglePortalAccess(active: boolean) {
    if (!selectedId) return
    if (!parentActionReason.trim()) { toast.error('A reason is required'); return }
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    fd.append('active', String(active))
    fd.append('reason', parentActionReason)
    const result = await setParentPortalAccess(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success(active ? 'Portal access reactivated' : 'Portal access disabled')
    setParentActionReason('')
    openDrawer(selectedId)
  }

  async function handleRevokeSessions() {
    if (!selectedId) return
    if (!revokeReason.trim()) { toast.error('A reason is required'); return }
    setActionLoading(true)
    const fd = new FormData()
    fd.append('user_id', selectedId)
    fd.append('reason', revokeReason)
    const result = await revokeSessions(fd)
    setActionLoading(false)
    if (!result.success) { toast.error(result.message || 'Failed'); return }
    toast.success('All sessions revoked')
    setRevokeReason('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="input pl-9"
        />
      </div>

      <div className="card overflow-hidden">
        {loading && (
          <div className="p-6 flex justify-center"><Loader2 className="animate-spin" size={18} /></div>
        )}

        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="p-6 text-sm text-ink-faint text-center">No users found.</p>
        )}

        {!loading && query.trim().length < 2 && results.length === 0 && (
          <p className="p-6 text-sm text-ink-faint text-center">No users yet.</p>
        )}

        {isDefaultList && !loading && results.length > 0 && (
          <p className="px-4 pt-3 text-xs text-ink-faint">Showing recently active users. Search to narrow down.</p>
        )}

        {!loading && results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Org / School</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Plan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Last Login</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Badges</th>
                </tr>
              </thead>
              <tbody>
                {results.map(u => (
                  <tr
                    key={u.id}
                    onClick={() => openDrawer(u.id)}
                    className="border-b border-surface-100 hover:bg-surface-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{u.name}</p>
                      <p className="text-xs text-ink-faint">{u.email}{u.phone ? ` · ${u.phone}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{u.primaryType}</td>
                    <td className="px-4 py-3 text-ink-muted">{u.orgLabel}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[u.accountStatus] ?? STATUS_STYLE.active}`}>
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{u.plan ?? '—'}</td>
                    <td className="px-4 py-3 text-ink-faint text-xs">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-NG') : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {u.badges.representative && <Handshake size={13} className="text-amber-600" />}
                        {u.badges.platformStaff && <Shield size={13} className="text-red-600" />}
                        {u.badges.parent && <UsersRound size={13} className="text-purple-600" />}
                        {u.badges.multiRole && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Multi-role</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">User Profile</h2>
              <button onClick={closeDrawer}><X size={18} className="text-ink-faint" /></button>
            </div>

            {detailLoading && <div className="flex justify-center py-8"><Loader2 className="animate-spin" size={18} /></div>}

            {detail && !detailLoading && (
              <>
                <div>
                  <p className="font-medium text-ink">{detail.profile.name}</p>
                  <p className="text-sm text-ink-muted">{detail.profile.email}</p>
                  <p className="text-sm text-ink-muted">{detail.profile.phone ?? '—'}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[detail.profile.accountStatus] ?? STATUS_STYLE.active}`}>
                    {detail.profile.accountStatus}
                  </span>
                </div>

                {detail.organization && (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-1 flex items-center gap-1"><Building2 size={12} /> Organization</p>
                    <p className="text-ink">{detail.organization.name}</p>
                    <p className="text-ink-faint text-xs">{detail.organization.subscription_plan} · {detail.organization.subscription_status}</p>
                  </div>
                )}

                {detail.representative && (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-1 flex items-center gap-1"><Handshake size={12} /> Representative</p>
                    <p className="text-ink">{detail.representative.territory_state ?? '—'} · Level {detail.representative.level ?? '—'}</p>
                  </div>
                )}

                {detail.platformStaff && (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-1 flex items-center gap-1"><Shield size={12} /> Platform Staff</p>
                    <p className="text-ink">{detail.platformStaff.roleName ?? 'Staff'}</p>
                  </div>
                )}

                <div className="text-sm">
                  <p className="text-xs font-semibold text-ink-muted uppercase mb-1">Security</p>
                  <p className="text-ink-muted text-xs">Failed logins (24h): <strong>{detail.failedLoginsLast24h}</strong></p>
                  <p className="text-ink-muted text-xs">Last login: {detail.profile.lastLogin ? new Date(detail.profile.lastLogin).toLocaleString('en-NG') : 'Never'}</p>
                  {detail.profile.accountStatus === 'locked' && (
                    <p className="text-xs text-red-600 mt-1">Locked: {detail.profile.lockReason}</p>
                  )}
                </div>

                {detail.recentLogins?.length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-1">Recent Logins</p>
                    <div className="divide-y divide-surface-100">
                      {detail.recentLogins.map((l: any, i: number) => (
                        <div key={i} className="py-1.5 text-xs flex justify-between">
                          <span className={l.success ? 'text-ink-muted' : 'text-red-600'}>
                            {l.success ? 'Success' : 'Failed'} · {l.ip_address ?? '—'}
                          </span>
                          <span className="text-ink-faint">{new Date(l.created_at).toLocaleString('en-NG')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canManageLocks && (
                  <div className="pt-3 border-t border-surface-100">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Actions</p>
                    {detail.profile.accountStatus === 'locked' ? (
                      <button
                        onClick={handleUnlock}
                        disabled={actionLoading}
                        className="btn-primary btn-sm btn flex items-center gap-1.5"
                      >
                        <Unlock size={14} /> Unlock Account
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          value={lockReason}
                          onChange={e => setLockReason(e.target.value)}
                          placeholder="Reason for locking this account…"
                          className="input input-sm"
                        />
                        <button
                          onClick={handleLock}
                          disabled={actionLoading}
                          className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-1.5 justify-center"
                        >
                          <Lock size={14} /> Lock Account
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {canRevokeSessions && detail.profile.role !== 'parent' && (
                  <div className="pt-3 border-t border-surface-100">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Revoke Sessions</p>
                    <div className="flex flex-col gap-2">
                      <input
                        value={revokeReason}
                        onChange={e => setRevokeReason(e.target.value)}
                        placeholder="Reason…"
                        className="input input-sm"
                      />
                      <button
                        onClick={handleRevokeSessions}
                        disabled={actionLoading}
                        className="btn-secondary btn-sm btn"
                      >
                        Sign Out All Devices
                      </button>
                    </div>
                  </div>
                )}

                {canForceReset && detail.profile.role !== 'parent' && (
                  <div className="pt-3 border-t border-surface-100">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Force Password Reset</p>
                    <div className="flex flex-col gap-2">
                      <input
                        value={resetReason}
                        onChange={e => setResetReason(e.target.value)}
                        placeholder="Reason for forcing a reset…"
                        className="input input-sm"
                      />
                      <button
                        onClick={handleForceReset}
                        disabled={actionLoading}
                        className="btn-secondary btn-sm btn"
                      >
                        Send Reset Email
                      </button>
                    </div>
                  </div>
                )}

                {canManageParentAccess && detail.profile.role === 'parent' && (
                  <div className="pt-3 border-t border-surface-100">
                    <p className="text-xs font-semibold text-ink-muted uppercase mb-2">Parent Portal Access</p>
                    <div className="flex flex-col gap-2">
                      <input
                        value={parentActionReason}
                        onChange={e => setParentActionReason(e.target.value)}
                        placeholder="Reason…"
                        className="input input-sm"
                      />
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={handleRegenerateCode}
                          disabled={actionLoading}
                          className="btn-secondary btn-sm btn"
                        >
                          Regenerate Code
                        </button>
                        {detail.parent?.accessCodeActive ? (
                          <button
                            onClick={() => handleTogglePortalAccess(false)}
                            disabled={actionLoading}
                            className="btn-sm btn border border-red-200 text-red-600 hover:bg-red-50"
                          >
                            Disable Access
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePortalAccess(true)}
                            disabled={actionLoading}
                            className="btn-primary btn-sm btn"
                          >
                            Reactivate Access
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <p className="text-xs text-ink-faint pt-2 border-t border-surface-100">
                  Role management and login history detail are coming in later phases.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}