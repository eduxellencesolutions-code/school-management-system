import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../supabase/client'
import { registerForPushNotifications, unregisterCurrentDevice } from '../notifications/registerForPush'

export type UserRole = 'admin' | 'school_admin' | 'principal' | 'teacher' | 'lecturer' | 'assistant'

export interface StaffProfile {
  kind: 'staff'
  id: string
  name: string
  role: UserRole
  organizationId: string | null
  isActive: boolean
}

export interface ParentProfile {
  kind: 'parent'
  id: string // auth user id
  parentAccountId: string
  fullName: string
}

export interface StudentProfile {
  kind: 'student'
  id: string // auth user id
  learnerId: string
}

export type Profile = StaffProfile | ParentProfile | StudentProfile

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  authError: string | null
  clearAuthError: () => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithAccessCode: (code: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Maps Supabase's internal error codes/messages to messages safe and
// clear to show a school admin/teacher — never surfaces raw error objects.
function mapAuthError(error: { message?: string; code?: string; status?: number } | null): string {
  if (!error) return 'Something went wrong. Please try again.'

  const code = error.code ?? ''
  const message = error.message ?? ''

  if (code === 'invalid_credentials' || message.includes('Invalid login credentials')) {
    return 'Incorrect email or password.'
  }
  if (code === 'email_not_confirmed' || message.includes('Email not confirmed')) {
    return 'Please verify your email address before logging in. Check your inbox for a confirmation link.'
  }
  if (code === 'over_request_rate_limit' || message.includes('rate limit')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  if (message.includes('Network request failed') || message.includes('fetch')) {
    return 'No internet connection. Please check your network and try again.'
  }
  return 'Unable to log in right now. Please try again.'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Fetches the user's identity from whichever table actually has a row:
  // 1. `users` (staff) — the server's answer, scoped by RLS
  // 2. `parent_accounts` (parent) — linked by auth_user_id
  // 3. `get_my_learner_id()` RPC (student) — resolves the caller to a learner
  // Never a value trusted from anywhere on the client.
  async function loadProfile(userId: string): Promise<Profile | null> {
    const { data: staffRow } = await supabase
      .from('users')
      .select('id, name, role, organization_id, is_active')
      .eq('id', userId)
      .maybeSingle()

    if (staffRow) {
      return {
        kind: 'staff',
        id: staffRow.id,
        name: staffRow.name,
        role: staffRow.role as UserRole,
        organizationId: staffRow.organization_id,
        isActive: staffRow.is_active,
      }
    }

    const { data: parentRow } = await supabase
      .from('parent_accounts')
      .select('id, full_name')
      .eq('auth_user_id', userId)
      .maybeSingle()

    if (parentRow) {
      return {
        kind: 'parent',
        id: userId,
        parentAccountId: parentRow.id,
        fullName: parentRow.full_name,
      }
    }

    const { data: studentLearnerId } = await supabase.rpc('get_my_learner_id')
    if (studentLearnerId) {
      return { kind: 'student', id: userId, learnerId: studentLearnerId }
    }

    return null
  }

  async function handleSessionChange(newSession: Session | null) {
    setSession(newSession)
    if (!newSession) { setProfile(null); setLoading(false); return }

    const loadedProfile = await loadProfile(newSession.user.id)

    if (!loadedProfile) {
      await supabase.auth.signOut()
      setProfile(null)
      setAuthError('We could not find an account matching this login.')
      setLoading(false)
      return
    }

    if (loadedProfile.kind === 'staff') {
      if (!loadedProfile.isActive) {
        await supabase.auth.signOut()
        setProfile(null)
        setAuthError('Your account has been deactivated. Please contact your school administrator.')
        setLoading(false)
        return
      }
      if (!['admin', 'school_admin', 'principal', 'teacher', 'lecturer', 'assistant'].includes(loadedProfile.role)) {
        await supabase.auth.signOut()
        setProfile(null)
        setAuthError('This account type is not yet supported in the mobile app.')
        setLoading(false)
        return
      }
    }

    // Fire-and-forget push registration. Any error here is non-fatal —
    // the user is still logged in and everything else works. Registration
    // should be idempotent on the server side (skip if the token is already
    // saved for this user), since this may run repeatedly on token refreshes.
    if (loadedProfile.kind === 'staff') {
      registerForPushNotifications(loadedProfile.id, loadedProfile.organizationId).catch(() => {})
    } else if (loadedProfile.kind === 'parent') {
      registerForPushNotifications(loadedProfile.id, null).catch(() => {})
    } else if (loadedProfile.kind === 'student') {
      registerForPushNotifications(loadedProfile.id, null).catch(() => {})
    }

    setProfile(loadedProfile)
    setAuthError(null)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      handleSessionChange(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      handleSessionChange(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    setAuthError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        // Log only the error code/category — never the email or password,
        // and never the full error object (which can include request context).
        console.warn('Sign-in failed:', error.code ?? error.name)
        const friendly = mapAuthError(error)
        setAuthError(friendly)
        return { error: friendly }
      }
      return { error: null }
    } catch {
      const friendly = 'No internet connection. Please check your network and try again.'
      setAuthError(friendly)
      return { error: friendly }
    }
  }

  async function signInWithAccessCode(code: string): Promise<{ error: string | null }> {
    setAuthError(null)
    try {
      const res = await fetch('https://results.eduxellence.org/api/parents/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      })
      const data = await res.json()

      if (!data.success || !data.token_hash) {
        const message = data.error ?? 'Could not verify this code.'
        setAuthError(message)
        return { error: message }
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' })
      if (error) {
        console.warn('verifyOtp failed:', error.code ?? error.name)
        const message = 'This code could not be verified. Please request a new one from your school.'
        setAuthError(message)
        return { error: message }
      }
      return { error: null }
    } catch {
      const message = 'No internet connection. Please check your network and try again.'
      setAuthError(message)
      return { error: message }
    }
  }

  async function signOut() {
    // Fire-and-forget unregister — don't let a slow network call hang logout.
    if (session?.user?.id) {
      unregisterCurrentDevice(session.user.id).catch(() => {})
    }
    await supabase.auth.signOut() // revokes the refresh token server-side
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        authError,
        clearAuthError: () => setAuthError(null),
        signIn,
        signInWithAccessCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}