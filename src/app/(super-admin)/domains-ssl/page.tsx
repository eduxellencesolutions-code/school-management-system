// FILE: src/app/(super-admin)/domains-ssl/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Globe } from 'lucide-react'
import { getStaffAccess } from '@/lib/auth/getStaffAccess'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import { markSslActive } from './actions'

export const dynamic = 'force-dynamic'

interface PendingDomain {
  id: string
  organization_id: string
  org_name: string
  hostname: string
  domain_type: 'eduxellence_subdomain' | 'custom_domain'
  verified_at: string
  ssl_status: string
}

export default async function DomainsSslPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { error: errorParam, success: successParam } = await searchParams
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // This is a super-admin-only screen, matching how mark_domain_ssl_active_manually
  // and get_domains_pending_ssl are gated — is_super_admin() only, no
  // platform_permission key (none inspected/confirmed for this feature).
  const access = await getStaffAccess(supabase, user.id)
  if (!access.isSuperAdmin) redirect('/welcome')

  // get_domains_pending_ssl() enforces is_super_admin() internally too —
  // this is defense in depth, not the only check.
  const { data: pending, error: pendingError } = await supabase.rpc('get_domains_pending_ssl')

  if (pendingError) {
    console.error('Error fetching domains pending SSL:', pendingError)
  }

  const domains: PendingDomain[] = pending ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Domain SSL — Manual Provisioning</h1>
        <p className="text-sm text-ink-muted mt-1">
          {domains.length} domain{domains.length === 1 ? '' : 's'} verified and waiting on SSL.
          Add each hostname in the Vercel project dashboard, confirm the certificate is
          issued, then mark it active here.
        </p>
      </div>

      {errorParam && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{decodeURIComponent(errorParam)}</p>
        </div>
      )}
      {successParam && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700">{decodeURIComponent(successParam)}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Hostname</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Institution</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Verified</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase"></th>
              </tr>
            </thead>
            <tbody>
              {domains.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ink-faint text-sm">
                    Nothing pending — every verified domain already has SSL active.
                  </td>
                </tr>
              )}
              {domains.map(d => (
                <tr key={d.id} className="border-b border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-ink flex items-center gap-2">
                    <Globe size={14} className="text-ink-faint" /> {d.hostname}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{d.org_name}</td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {d.domain_type === 'eduxellence_subdomain' ? 'Eduxellence subdomain' : 'Custom domain'}
                  </td>
                  <td className="px-4 py-3 text-ink-faint text-xs">
                    {new Date(d.verified_at).toLocaleDateString('en-NG')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={markSslActive}>
                      <input type="hidden" name="domain_id" value={d.id} />
                      <button type="submit" className="text-brand-600 text-xs font-medium hover:underline">
                        Mark SSL active →
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}