// FILE: src/app/(dashboard)/settings/domains/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { addDomain, activateDomain, deactivateDomain, setPrimaryDomain } from './actions'

interface DomainRow {
  id: string
  hostname: string
  domain_type: 'eduxellence_subdomain' | 'custom_domain'
  is_primary: boolean
  verification_status: 'pending' | 'verified' | 'failed' | 'suspended'
  ssl_status: string
  activated_at: string | null
  deactivated_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  verified: 'bg-blue-50 text-blue-700 border-blue-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-surface-100 text-ink-faint border-surface-200',
}

export default function DomainsSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')

  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [verifying, setVerifying] = useState<string | null>(null)
  const [dnsInstructions, setDnsInstructions] = useState<Record<string, any>>({})
  const [verifyMessage, setVerifyMessage] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      router.replace('/dashboard')
      return
    }

    const admin = profile.role === 'admin'
    setIsAdmin(admin)
    if (!admin) {
      router.replace('/dashboard')
      return
    }

    // RLS already scopes this to the caller's own organization —
    // no .eq('organization_id', ...) needed or wanted here.
    const { data } = await supabase
      .from('organization_domains')
      .select('*')
      .order('created_at', { ascending: false })

    setDomains(data ?? [])
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    load()
  }, [load])

  async function handleAdd(formData: FormData) {
    await addDomain(formData)
  }

  async function showDnsInstructions(domainId: string) {
    const { data } = await supabase.rpc('get_domain_verification_target', {
      p_domain_id: domainId,
    })
    setDnsInstructions(prev => ({ ...prev, [domainId]: data }))
  }

  async function handleVerify(domainId: string) {
    setVerifying(domainId)
    setVerifyMessage(prev => ({ ...prev, [domainId]: '' }))
    try {
      const res = await fetch(`/api/domains/${domainId}/verify`, { method: 'POST' })
      const data = await res.json()
      if (data.status === 'verified') {
        setVerifyMessage(prev => ({ ...prev, [domainId]: 'Verified! You can now activate this domain.' }))
        await load()
      } else {
        setVerifyMessage(prev => ({ ...prev, [domainId]: data.error ?? 'Not verified yet.' }))
      }
    } catch {
      setVerifyMessage(prev => ({ ...prev, [domainId]: 'Verification check failed. Try again.' }))
    } finally {
      setVerifying(null)
    }
  }

  if (loading) {
    return <p className="text-sm text-ink-faint">Loading…</p>
  }

  if (!isAdmin) {
    return null // already redirected in load()
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-1">Custom Domains</h1>
      <p className="page-subtitle mb-6">
        Give your institution its own professional portal address.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}

      <form action={handleAdd} className="card p-6 flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Domain type</label>
          <select name="domain_type" className="input" defaultValue="eduxellence_subdomain">
            <option value="eduxellence_subdomain">Eduxellence subdomain (yourschool.eduxellence.org)</option>
            <option value="custom_domain">My own domain (portal.yourschool.edu.ng)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Hostname</label>
          <input
            type="text"
            name="hostname"
            placeholder="e.g. greenfieldhigh.eduxellence.org"
            className="input"
          />
          <p className="text-xs text-ink-faint mt-1">
            An Eduxellence subdomain must end in .eduxellence.org. Your own domain must not.
          </p>
        </div>
        <button type="submit" className="btn-primary btn w-fit">Add domain</button>
      </form>

      <div className="flex flex-col gap-4">
        {domains.length === 0 && (
          <p className="text-sm text-ink-faint">No domains added yet.</p>
        )}

        {domains.map(d => (
          <div key={d.id} className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-ink">{d.hostname}</p>
                {d.is_primary && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                    Primary
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[d.verification_status]}`}
              >
                {d.verification_status}
              </span>
            </div>

            <p className="text-xs text-ink-faint mb-3">
              {d.domain_type === 'eduxellence_subdomain' ? 'Eduxellence subdomain' : 'Custom domain'}
              {d.activated_at && !d.deactivated_at ? ' · Active' : ' · Not active'}
            </p>

            {d.verification_status !== 'verified' && (
              <div className="flex flex-col gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => showDnsInstructions(d.id)}
                  className="btn-secondary btn-sm btn w-fit"
                >
                  Show DNS instructions
                </button>

                {dnsInstructions[d.id] && (
                  <div className="bg-surface-50 border border-surface-200 rounded-lg p-3 text-xs font-mono">
                    <p>TXT record: {dnsInstructions[d.id].record_name}</p>
                    <p>Value: {dnsInstructions[d.id].record_value}</p>
                    <p className="mt-2">CNAME: {dnsInstructions[d.id].cname_name} → {dnsInstructions[d.id].cname_value}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleVerify(d.id)}
                  disabled={verifying === d.id}
                  className="btn-primary btn-sm btn w-fit"
                >
                  {verifying === d.id ? 'Checking…' : 'Check verification'}
                </button>

                {verifyMessage[d.id] && (
                  <p className="text-xs text-ink-muted">{verifyMessage[d.id]}</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {d.verification_status === 'verified' && !d.activated_at && (
                <form action={activateDomain}>
                  <input type="hidden" name="domain_id" value={d.id} />
                  <button type="submit" className="btn-primary btn-sm btn">Activate</button>
                </form>
              )}

              {d.activated_at && !d.deactivated_at && !d.is_primary && (
                <form action={setPrimaryDomain}>
                  <input type="hidden" name="domain_id" value={d.id} />
                  <button type="submit" className="btn-secondary btn-sm btn">Make primary</button>
                </form>
              )}

              {d.activated_at && !d.deactivated_at && (
                <form action={deactivateDomain}>
                  <input type="hidden" name="domain_id" value={d.id} />
                  <button type="submit" className="btn-secondary btn-sm btn text-red-600">Deactivate</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}