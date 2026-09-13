import { Redirect } from 'expo-router'
import { useAuth } from '../../src/lib/auth/AuthContext'

export default function AppIndex() {
  const { profile } = useAuth()
  if (!profile) return null

  if (profile.kind === 'parent') return <Redirect href="/(app)/parent" />
  if (profile.kind === 'student') return <Redirect href="/(app)/student" />
  if (profile.kind === 'staff' && ['admin', 'school_admin', 'principal'].includes(profile.role)) return <Redirect href="/(app)/admin" />
  if (profile.kind === 'staff' && ['teacher', 'lecturer', 'assistant'].includes(profile.role)) return <Redirect href="/(app)/teacher" />
  return null
}