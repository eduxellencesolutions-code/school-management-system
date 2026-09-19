// src/app/api/domains/[id]/verify/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { promises as dns } from 'dns'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const VERIFY_PREFIX = '_eduxellence-verify.'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: domainId } = await params

  const supabase = await createClient()
  const { user, transient } = await getAuthenticatedUser(supabase)

  if (transient) {
    return NextResponse.json({ error: 'Session refreshing, please retry' }, { status: 503 })
  }
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

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
    const records = await dns.resolveTxt(recordName)
    observedTokens = records.map(chunks => chunks.join('').trim())
  } catch (err: any) {
    const code = err?.code
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      return NextResponse.json(
        {
          status: 'pending',
          error: 'No TXT record found yet. DNS changes can take up to an hour to propagate.',
          expectedRecord: recordName,
        },
        { status: 200 }
      )
    }
    return NextResponse.json(
      { status: 'pending', error: 'DNS lookup failed. Please try again shortly.' },
      { status: 200 }
    )
  }

  const match = observedTokens.find(t => t === domain.verification_token)

  if (!match) {
    return NextResponse.json(
      {
        status: 'pending',
        error:
          observedTokens.length > 0
            ? 'A TXT record exists but does not match the expected value.'
            : 'No matching TXT record found.',
        expectedRecord: recordName,
      },
      { status: 200 }
    )
  }

  const admin = createAdminClient()
  const { data: verified, error: verifyError } = await admin.rpc('mark_domain_verified', {
    p_domain_id: domainId,
    p_presented_token: match,
  })

  if (verifyError) {
    return NextResponse.json({ status: 'failed', error: verifyError.message }, { status: 400 })
  }

  return NextResponse.json({
    status: 'verified',
    domain: verified,
    next: 'SSL provisioning will begin shortly. The domain becomes live once SSL is active and you activate it.',
  })
}