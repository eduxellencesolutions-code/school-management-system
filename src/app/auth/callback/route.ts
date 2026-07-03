import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // ── Password reset flow (token_hash + type=recovery) ──
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
    if (!error) {
      // Session is now set — send to password reset page
      return NextResponse.redirect(new URL('/auth/reset-password', request.url))
    }
    // Token invalid or expired
    return NextResponse.redirect(new URL('/auth/reset-password?error=invalid_token', request.url))
  }

  // ── OAuth / magic link flow (code) ──
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Fallback
  return NextResponse.redirect(new URL('/login?error=auth_failed', request.url))
}
