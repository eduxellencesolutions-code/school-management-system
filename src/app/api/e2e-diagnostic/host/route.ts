// src/app/api/e2e-diagnostic/host/route.ts
// TEMPORARY test scaffolding. Returns 404 in production so it can never
// expose request headers on the live site.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getPortalContext } from '@/lib/domains/portalContext'

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 })
  }

  const portal = await getPortalContext()

  return NextResponse.json({
    hostHeader: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    allHeaders: Object.fromEntries(request.headers.entries()),
    portalContext: {
      hostname: portal.hostname,
      isPlatformHost: portal.isPlatformHost,
      organizationId: portal.organizationId,
      orgName: portal.orgName,
      orgType: portal.orgType,
      logoUrl: portal.logoUrl,
      colors: portal.colors,
      isPrimaryDomain: portal.isPrimaryDomain,
    },
  })
}