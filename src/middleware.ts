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

  // ✅ UPDATED: Admin host — only allow paths that belong to (super-admin) route group
  if (isAdminHost) {
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')

    const { data: staffRow } = isSuperAdmin
      ? { data: null }
      : await supabase
          .from('platform_staff')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

    if (!isSuperAdmin && !staffRow) {
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.hostname = 'results.eduxellence.org'
      return NextResponse.redirect(redirectUrl)
    }

    // ✅ All admin paths whitelisted - updated with /security
    const ADMIN_PATHS = [
      '/overview',
      '/schools',
      '/solo-teachers',
      '/commissions',
      '/representatives',
      '/support',
      '/team',
      '/audit',
      '/analytics',
      '/platform-announcements',
      '/security',  // ✅ Added
    ]
    const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

    if (pathname === '/dashboard' || pathname === '/workspaces' || !isAdminPath) {
      // Any non-admin route (old teacher/rep pages, generic /dashboard, /workspaces, etc.)
      // requested on admin.* gets redirected to the correct admin landing page instead.
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