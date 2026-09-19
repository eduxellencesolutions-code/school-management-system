// src/app/api/e2e-diagnostic/host/route.ts
//
// TEMPORARY diagnostic route (path: /api/e2e-diagnostic/host — moved out
// of an underscore-prefixed folder, which Next.js excludes from routing
// entirely). Exists solely to answer: does a client-supplied Host header
// override survive Vercel's edge/proxy layer and reach this Next.js route
// unmodified? Returns the raw header value seen by the application —
// nothing else, no application logic touched.
//
// Not a security concern to leave running (returns no sensitive data,
// doesn't affect routing or auth), but it's test scaffolding, not a real
// product route — remove once the E2E hostname-testing approach is
// confirmed working, or once Step "close this out" is reached.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    hostHeader: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    allHeaders: Object.fromEntries(request.headers.entries()),
  })
}