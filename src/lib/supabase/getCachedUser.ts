// src/lib/supabase/getCachedUser.ts
//
// WHY THIS FILE EXISTS:
// Server Components (page.tsx, layout.tsx) cannot set cookies — only
// Middleware, Route Handlers, and Server Actions can. Your middleware
// already refreshes the session on every request. If a Server Component
// independently calls supabase.auth.getUser() and the token happens to be
// expired, Supabase rotates the refresh token server-side but the new one
// can NEVER be written back to the browser (the write is silently caught
// and dropped). The browser is left holding a dead refresh token, and every
// future request — including middleware — fails with
// "Invalid Refresh Token: Refresh Token Not Found" until the user logs in
// again. This is almost certainly what's poisoning your sessions.
//
// THE FIX: never call supabase.auth.getUser() directly inside page.tsx or
// layout.tsx. Use this cached helper instead. React's cache() ensures that
// no matter how many Server Components in a single request tree ask "who is
// the user", the actual Supabase call only happens ONCE per request — and
// that single call reads the token middleware already refreshed, so it's
// safe.
//
// Route Handlers (route.ts) and Server Actions (actions.ts) are fine to
// leave using supabase.auth.getUser() directly — they CAN persist a
// refreshed session safely, so they aren't part of this specific bug.

import { cache } from 'react'
import { createClient } from './server'

export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  return supabase.auth.getUser()
})