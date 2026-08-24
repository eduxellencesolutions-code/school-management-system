import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'

// Only share the cookie across subdomains on the real production domain -
// leaves localhost/dev untouched, where a domain-scoped cookie would just
// silently fail to set.
function getCookieDomain(host: string | null): string | undefined {
  if (!host) return undefined
  const hostname = host.split(':')[0]
  if (hostname === 'localhost' || hostname === '127.0.0.1') return undefined
  if (hostname.endsWith('eduxellence.org')) return '.eduxellence.org'
  return undefined
}

export async function createClient() {
  const cookieStore = await cookies()
  const headersList = await headers()
  const domain = getCookieDomain(headersList.get('host'))

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...(domain ? { domain } : {}),
              })
            )
          } catch {}
        },
      },
    }
  )
}