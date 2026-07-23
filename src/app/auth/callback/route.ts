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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

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