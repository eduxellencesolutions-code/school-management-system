// src/app/api/domains/[id]/verify/route.ts
//
// Real DNS TXT verification. Node runtime is mandatory — the Edge runtime
// has no way to make this kind of request reliably.
//
// Uses DNS-over-HTTPS (Cloudflare's public resolver) via a plain HTTPS
// fetch, instead of Node's built-in `dns` module. Raw UDP DNS resolution
// can behave unreliably inside serverless sandboxes (including Vercel's),
// and a plain HTTPS request avoids that entire class of problem.
//
// Flow:
//   1. Caller (an org admin) asks to verify a domain they own.
//   2. We re-read the domain row scoped to THEIR organization via RLS, so
//      an admin cannot trigger verification on another institution's row.
//   3. We look up _eduxellence-verify.<hostname> TXT via DoH.
//   4. We call mark_domain_verified() with the token we actually observed.
//      The database compares it against the stored challenge and rotates
//      the token on success, so the published DNS value is spent.
//
// The route never decides verification succeeded — it only observes what's
// published in DNS and hands that to the database, which makes the real
// decision.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VERIFY_PREFIX = '_eduxellence-verify.'

async function resolveTxtViaDoH(hostname: string): Promise<string[]> {
  const res = await fetch(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=TXT`,
    { headers: { Accept: 'application/dns-json' } }
  )
  if (!res.ok) throw new Error(`DoH lookup failed: ${res.status}`)
  const data = await res.json()
  const answers = data.Answer ?? []
  // TXT answers come back double-quoted, e.g. "\"abc123\"" — strip the quotes.
  return answers.map((a: { data: string }) => a.data.replace(/^"|"$/g, ''))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: domainId } = await params

  const supabase = await createClient()
  const { user, transient } = await getAuthenticatedUser(supabase)

  if (transient) {
    return NextResponse.json(
      { error: 'Session refreshing, please retry' },
      { status: 503 }
    )
  }
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // RLS scopes this read to the caller's own organization. If the domain
  // belongs to another institution, this simply returns nothing — the
  // caller cannot even observe that it exists.
  const { data: domain, error: readError } = await supabase
    .from('organization_domains')
    .select('id, hostname, verification_status, verification_token')
    .eq('id', domainId)
    .maybeSingle()

  if (readError || !domain) {
    return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
  }

  if (domain.verification_status === 'verified') {
    return NextResponse.json({ status: 'verified', alreadyVerified: true })
  }

  const recordName = VERIFY_PREFIX + domain.hostname
  let observedTokens: string[] = []

  try {
    observedTokens = await resolveTxtViaDoH(recordName)
  } catch {
    return NextResponse.json(
      { status: 'pending', error: 'DNS lookup failed. Please try again shortly.' },
      { status: 200 }
    )
  }

  if (observedTokens.length === 0) {
    return NextResponse.json(
      {
        status: 'pending',
        error: 'No TXT record found yet. DNS changes can take up to an hour to propagate.',
        expectedRecord: recordName,
      },
      { status: 200 }
    )
  }

  const match = observedTokens.find(t => t === domain.verification_token)

  if (!match) {
    return NextResponse.json(
      {
        status: 'pending',
        error: 'A TXT record exists but does not match the expected value.',
        expectedRecord: recordName,
      },
      { status: 200 }
    )
  }

  // mark_domain_verified() is service_role-only by design: verification is
  // a privileged state transition that must not be reachable from a browser.
  const admin = createAdminClient()
  const { data: verified, error: verifyError } = await admin.rpc(
    'mark_domain_verified',
    { p_domain_id: domainId, p_presented_token: match }
  )

  if (verifyError) {
    return NextResponse.json(
      { status: 'failed', error: verifyError.message },
      { status: 400 }
    )
  }

  return NextResponse.json({
    status: 'verified',
    domain: verified,
    next: 'SSL provisioning will begin shortly. The domain becomes live once SSL is active and you activate it.',
  })
}