import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname
  
  console.log('🔍 Middleware hit:', { hostname, pathname })

  // Handle admin subdomain - check BEFORE auth logic
  if (hostname.startsWith('admin.')) {
    console.log('🔍 Admin subdomain detected:', { hostname, pathname })
    const url = request.nextUrl.clone()
    
    // Handle root and dashboard paths - redirect to overview
    if (url.pathname === '/' || url.pathname === '/dashboard') {
      url.pathname = '/super-admin/overview'
      console.log('🔍 Redirecting to overview:', url.pathname)
    } else if (!url.pathname.startsWith('/super-admin')) {
      // Prepend /super-admin to all other paths
      url.pathname = `/super-admin${url.pathname}`
      console.log('🔍 Rewriting to super-admin:', url.pathname)
    } else {
      console.log('🔍 Already on super-admin path:', url.pathname)
    }
    
    return NextResponse.rewrite(url)
  }

  try {
    return await updateSession(request)
  } catch (error) {
    console.error('Middleware error:', error)
    // Fall through to allow the request to continue if session update fails
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets (svg, png, jpg, etc.)
     * - /parent (public route - no auth required)
     * - /api/parent (public API - no auth required)
     * - /login, /signup (public auth routes)
     * - /auth/set-password (public route for setting password after invite)
     * - /api/auth (public auth API)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|parent|api/parent|login|signup|auth/set-password|api/auth).*)',
  ],
}
