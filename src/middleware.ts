import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { NAV_ITEMS } from '@/lib/auth/navConfig'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  const isAdminHost = hostname.startsWith('admin.')

  let response = NextResponse.next({ request })

  // Skip session-refresh logic entirely for Next.js Link prefetch requests.
  // These fire silently in the background for every visible link and can
  // race against a real navigation's refresh token, causing spurious
  // "refresh_token_not_found" sign-outs. Prefetch requests don't need
  // to run auth checks — the actual navigation request will.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('sec-purpose')?.includes('prefetch')

  if (isPrefetch) {
    return response
  }

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
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getClaims() instead of getUser() to avoid refresh token issues
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()

  if (claimsError || !claimsData?.claims) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  const userId = claimsData.claims.sub

  if (isAdminHost) {
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
    const { data: staffRow } = isSuperAdmin
      ? { data: null }
      : await supabase
          .from('platform_staff')
          .select('id, status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle()

    if (!isSuperAdmin && !staffRow) {
      const redirectUrl = new URL('/dashboard', request.url)
      redirectUrl.hostname = 'results.eduxellence.org'
      return NextResponse.redirect(redirectUrl)
    }

    const ADMIN_PATHS = NAV_ITEMS.map(i => i.href)
    const isAdminPath = ADMIN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

    if (pathname === '/dashboard' || pathname === '/workspaces' || !isAdminPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/welcome'
      return NextResponse.rewrite(url)
    }

    if (!isSuperAdmin) {
      const matchedItem = NAV_ITEMS.find(
        item => pathname === item.href || pathname.startsWith(item.href + '/')
      )

      if (matchedItem?.superAdminOnly) {
        const url = request.nextUrl.clone()
        url.pathname = '/welcome'
        return NextResponse.rewrite(url)
      }

      if (matchedItem?.requiredPermission) {
        const { data: hasPermission } = await supabase.rpc('has_platform_permission', {
          p_user_id: userId,
          p_permission_key: matchedItem.requiredPermission,
        })
        if (!hasPermission) {
          const url = request.nextUrl.clone()
          url.pathname = '/welcome'
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