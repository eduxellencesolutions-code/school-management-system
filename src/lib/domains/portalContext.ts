// src/lib/domains/portalContext.ts
//
// Hostname -> portal/branding context.
//
// ============================ SECURITY INVARIANT ============================
// The organizationId returned by this module identifies WHICH INSTITUTION'S
// PORTAL the visitor has arrived at. It is NOT, and must never become, the
// value used to scope a data query.
//
// Tenant data access is determined exclusively by the authenticated session,
// via get_my_org_id() inside Postgres RLS. If you find yourself passing
// portalContext.organizationId into a .eq('organization_id', ...) filter or
// into an RPC that reads tenant rows, stop — that is the exact cross-tenant
// vulnerability this design exists to prevent.
//
// Legitimate uses: logo, colours, portal title, favicon, <title>, and the
// session-vs-hostname cross-check in comparePortalToSession().
// ===========================================================================

import { cache } from 'react'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export interface PortalContext {
  hostname: string
  isPlatformHost: boolean
  organizationId: string | null
  orgName: string | null
  orgType: 'school' | 'university' | 'centre' | null
  logoUrl: string | null
  colors: { primary?: string; secondary?: string } | null
  isPrimaryDomain: boolean
}

const PLATFORM_HOSTS = new Set([
  'eduxellence.org',
  'www.eduxellence.org',
  'results.eduxellence.org',
  'admin.eduxellence.org',
  'localhost',
])

function normalizeHost(raw: string | null): string {
  if (!raw) return ''
  return raw.split(':')[0].trim().toLowerCase()
}

function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTS.has(hostname)) return true
  if (hostname.endsWith('.vercel.app')) return true
  if (hostname.endsWith('.localhost')) return true
  return false
}

export const getPortalContext = cache(async (): Promise<PortalContext> => {
  const h = await headers()
  const hostname = normalizeHost(h.get('host'))

  const empty: PortalContext = {
    hostname,
    isPlatformHost: isPlatformHost(hostname),
    organizationId: null,
    orgName: null,
    orgType: null,
    logoUrl: null,
    colors: null,
    isPrimaryDomain: false,
  }

  if (!hostname || empty.isPlatformHost) return empty

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .rpc('resolve_organization_by_hostname', { p_hostname: hostname })
      .maybeSingle()

    if (error || !data) return empty

    return {
      hostname,
      isPlatformHost: false,
      organizationId: data.organization_id,
      orgName: data.org_name,
      orgType: data.org_type,
      logoUrl: data.logo_url,
      colors: data.colors,
      isPrimaryDomain: !!data.is_primary,
    }
  } catch {
    return empty
  }
})

export type PortalMatch =
  | 'platform'
  | 'unknown_host'
  | 'match'
  | 'mismatch'
  | 'anonymous'

export function comparePortalToSession(
  portal: PortalContext,
  sessionOrganizationId: string | null | undefined
): PortalMatch {
  if (portal.isPlatformHost) return 'platform'
  if (!portal.organizationId) return 'unknown_host'
  if (!sessionOrganizationId) return 'anonymous'
  return portal.organizationId === sessionOrganizationId ? 'match' : 'mismatch'
}