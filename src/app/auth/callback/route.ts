import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Permanent fix: this route used to build its own inline Supabase client,
// which meant it was the ONE place in the codebase that didn't apply the
// shared getCookieDomain() logic from lib/supabase/server.ts. That caused
// every session created through this route (all parent magic-link logins,
// password resets) to be written as a host-only cookie
// (Domain=results.eduxellence.org) instead of the shared
// Domain=.eduxellence.org cookie every other login path uses -- so a parent
// session and a staff session with the same cookie name could silently
// collide in the same browser.
//
// Fix: use the same createClient() everyone else uses, so there is exactly
// ONE place in the whole app that ever decides cookie domain. This class of
// bug can't recur without touching that single shared file.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const supabase = await createClient()

  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    if (!error) {
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
    return NextResponse.redirect(new URL('/auth/reset-password?error=invalid_token', request.url))
  }

  if (token_hash && type === 'magiclink') {
    const { data: sessionData, error } = await supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
    if (!error) {
      const isParentAccount = sessionData?.user?.user_metadata?.is_parent_account === true
      const destination = isParentAccount ? '/parent/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(destination, request.url))
    }
    return NextResponse.redirect(new URL('/access?error=invalid_code', request.url))
  }

  if (code) {
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const isParentAccount = sessionData?.user?.user_metadata?.is_parent_account === true
      const destination = isParentAccount ? '/parent/dashboard' : '/dashboard'
      return NextResponse.redirect(new URL(destination, request.url))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}