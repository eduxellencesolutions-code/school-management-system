import { useEffect } from 'react'
import { Stack, useRouter, useSegments, router as expoRouter } from 'expo-router'
import * as Notifications from 'expo-notifications'
import { AuthProvider, useAuth } from '../src/lib/auth/AuthContext'
import { NetworkProvider } from '../src/lib/network/NetworkContext'
import { OfflineBanner } from '../src/components/OfflineBanner'
import { SyncManager } from '../src/lib/offline/SyncManager'

function RootNavigation() {
  const { session, profile, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return
    const inAuthGroup = segments[0] === '(auth)'
    const isAuthenticated = session && profile

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(app)')
    }
  }, [session, profile, loading, segments])

  // Route to the Notifications screen whenever the user taps a push.
  // The listener fires for both foreground and background taps that
  // bring the app back to life — expo-notifications handles the
  // distinction internally.
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {
      expoRouter.push('/(app)/notifications')
    })
    return () => subscription.remove()
  }, [])

  if (loading) return null // swap for a splash screen component

  return <Stack screenOptions={{ headerShown: false }} />
}

export default function RootLayout() {
  return (
    <NetworkProvider>
      <AuthProvider>
        <SyncManager />
        <OfflineBanner />
        <RootNavigation />
      </AuthProvider>
    </NetworkProvider>
  )
}