import { createBrowserClient } from '@supabase/ssr'

// Same domain-scoping logic as the server client — only apply the shared
// cookie domain on the real production domain, leave localhost/dev alone.
function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined
  const hostname = window.location.hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
  if (hostname.endsWith('eduxellence.org')) return '.eduxellence.org'
  return undefined
}

export function createClient() {
  const domain = getCookieDomain()

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    domain ? { cookieOptions: { domain } } : undefined
  )
}