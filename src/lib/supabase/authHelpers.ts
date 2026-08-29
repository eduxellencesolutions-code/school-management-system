import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Supabase refresh tokens are single-use. When two requests share the same
 * expiring session cookie and both attempt to refresh at nearly the same
 * moment, the second one always fails with this error -- it's an expected,
 * transient race under Supabase's model, not evidence of a real auth
 * problem. Treat it as "try again shortly," never as "user is logged out."
 */
export function isTransientRefreshTokenError(
  error: { message?: string | null; code?: string | null } | null | undefined
): boolean {
  if (!error) return false
  return (
    error.code === 'refresh_token_already_used' ||
    error.code === 'refresh_token_not_found' ||
    !!error.message?.includes('Already Used') ||
    !!error.message?.includes('Refresh Token Not Found')
  )
}

export type AuthResult =
  | { user: User; transient: false }
  | { user: null; transient: true }
  | { user: null; transient: false }

/**
 * Drop-in replacement for `supabase.auth.getUser()` in API routes and
 * server components. Distinguishes a genuine "not logged in" from a
 * transient refresh-token race, so callers can respond appropriately
 * instead of hard-failing on a benign timing collision.
 */
export async function getAuthenticatedUser(supabase: SupabaseClient): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      if (isTransientRefreshTokenError(error)) {
        return { user: null, transient: true }
      }
      return { user: null, transient: false }
    }

    if (!data.user) {
      return { user: null, transient: false }
    }

    return { user: data.user, transient: false }
  } catch (err: any) {
    if (isTransientRefreshTokenError(err)) {
      return { user: null, transient: true }
    }
    throw err
  }
}