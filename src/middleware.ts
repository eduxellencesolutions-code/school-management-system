import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { NAV_ITEMS } from '@/lib/auth/navConfig'

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
    return NextResponse.redirect(new URL('/login', request.url))
  }

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

    const ADMIN_PATHS = NAV_ITEMS.map(i => i.href)
    const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

    // ✅ UPDATED: Fallback redirect from /overview to /welcome
    if (pathname === '/dashboard' || pathname === '/workspaces' || !isAdminPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/welcome'  // ✅ Changed from '/overview'
      return NextResponse.rewrite(url)
    }

    // Single source of truth for per-page access — same map that drives the
    // nav in SuperAdminShell. A link visible in nav is guaranteed reachable,
    // and no page-level check can silently disagree with it anymore.
    if (!isSuperAdmin) {
      const matchedItem = NAV_ITEMS.find(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      )

      if (matchedItem?.superAdminOnly) {
        const url = request.nextUrl.clone()
        url.pathname = '/welcome'  // ✅ Changed from '/overview'
        return NextResponse.rewrite(url)
      }

      if (matchedItem?.requiredPermission) {
        const { data: hasPermission } = await supabase.rpc('has_platform_permission', {
          p_user_id: user.id,
          p_permission_key: matchedItem.requiredPermission,
        })
        if (!hasPermission) {
          const url = request.nextUrl.clone()
          url.pathname = '/welcome'  // ✅ Changed from '/overview'
          return NextResponse.rewrite(url)
        }
      }
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