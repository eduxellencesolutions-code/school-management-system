import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
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
     * - /api/auth (public auth API)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|parent|api/parent|login|signup|api/auth).*)',
  ],
}
