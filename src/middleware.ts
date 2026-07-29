import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isAdminHost = hostname.startsWith('admin.')

  // Public / unauthenticated paths — allowed through on ANY host, including admin.*,
  // so the shared /login page still works regardless of which domain someone arrives from.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/parent') ||
    pathname.startsWith('/access') ||
    pathname === '/' ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ✅ FIX: Allow through anyone who is either a super admin OR an active platform_staff member
  if (isAdminHost) {
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

    if (!isSuperAdmin) {
      const { data: staffRow } = await supabase
        .from('platform_staff')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!staffRow) {
        // Logged in, but neither super admin nor active platform staff —
        // admin.* is not for this account, regardless of which path they typed.
        const redirectUrl = new URL('/dashboard', request.url)
        redirectUrl.hostname = 'results.eduxellence.org'
        return NextResponse.redirect(redirectUrl)
      }

      // Active platform staff — let them through, but they're not super admin,
      // so don't auto-rewrite /dashboard to /overview (that's super-admin-only).
      return response
    }

    // Confirmed super admin — root/dashboard requests land on the overview page.
    if (pathname === '/dashboard') {
      const url = request.nextUrl.clone()
      url.pathname = '/overview'
      return NextResponse.rewrite(url)
    }

    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|parent|access|api/parent|api/parents|login|signup|auth/set-password|api/auth).*)',
  ],
}