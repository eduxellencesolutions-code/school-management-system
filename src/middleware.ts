import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Same domain-scoping logic as the server/browser clients — only share the
// cookie across subdomains on the real production domain.
function getCookieDomain(host: string): string | undefined {
  const hostname = host.split(':')[0]
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
  if (hostname.endsWith('eduxellence.org')) return '.eduxellence.org'
  return undefined
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isAdminHost = hostname.startsWith('admin.')
  const cookieDomain = getCookieDomain(hostname)

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
            response.cookies.set(name, value, {
              ...options,
              ...(cookieDomain ? { domain: cookieDomain } : {}),
            })
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[middleware] no user found', { hostname, pathname })
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdminHost) {
    const { data: isSuperAdmin, error: superAdminError } = await supabase.rpc('is_super_admin')
    const { data: staffRow, error: staffError } = isSuperAdmin
      ? { data: null, error: null }
      : await supabase
          .from('platform_staff')
          .select('id, status')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .maybeSingle()

    // TEMPORARY DIAGNOSTIC — remove once cross-domain session sharing is confirmed working.
    console.error('[middleware admin-host check]', {
      userId: user.id,
      userEmail: user.email,
      pathname,
      isSuperAdmin,
      superAdminError: superAdminError?.message,
      staffRow,
      staffError: staffError?.message,
      timestamp: new Date().toISOString(),
    })

    if (!isSuperAdmin && !staffRow) {
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.hostname = 'results.eduxellence.org'
      return NextResponse.redirect(redirectUrl)
    }

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
      '/security',
    ]
    const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
    if (pathname === '/dashboard' || pathname === '/workspaces' || !isAdminPath) {
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