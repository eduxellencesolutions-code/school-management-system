import { Redirect, Slot } from 'expo-router'
import { useAuth } from '../../src/lib/auth/AuthContext'

export default function AppLayout() {
  const { profile } = useAuth()

  // RootNavigation already handles the "not logged in → /(auth)/login" case.
  // While profile is still loading, render nothing.
  if (!profile) return null

  if (profile.kind === 'staff') {
    if (['admin', 'school_admin', 'principal'].includes(profile.role)) {
      return <Redirect href="/(app)/admin" />
    }
    if (['teacher', 'lecturer', 'assistant'].includes(profile.role)) {
      return <Redirect href="/(app)/teacher" />
    }
  }

  if (profile.kind === 'parent') {
    return <Redirect href="/(app)/parent" />
  }

  if (profile.kind === 'student') {
    return <Redirect href="/(app)/student" />
  }

  // Unsupported role — render Slot as a fallback (RootNavigation handles auth)
  return <Slot />
}