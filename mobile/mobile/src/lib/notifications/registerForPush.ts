import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { supabase } from '../supabase/client'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function registerForPushNotifications(userId: string, organizationId: string | null): Promise<{ error: string | null }> {
  if (!Device.isDevice) {
    return { error: 'Push notifications require a physical device — not available on the simulator.' }
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    return { error: 'Push notification permission was not granted.' }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    })
  }

  let token: string
  try {
    // projectId is required by SDK 49+ and comes from an EAS project —
    // this call will throw until the app is linked to a real Expo account.
    const result = await Notifications.getExpoPushTokenAsync()
    token = result.data
  } catch (e: any) {
    return { error: 'Could not generate a push token. This app is not yet linked to an Expo project.' }
  }

  const { error } = await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      organization_id: organizationId,
      expo_push_token: token,
      platform: Platform.OS,
      device_name: Device.deviceName ?? null,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,expo_push_token' }
  )

  if (error) return { error: 'Could not save push token.' }
  return { error: null }
}

export async function unregisterCurrentDevice(userId: string): Promise<void> {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync()
    await supabase.from('device_push_tokens').delete().eq('user_id', userId).eq('expo_push_token', data)
  } catch {
    // No token to unregister (e.g. no Expo project linked yet) — nothing to clean up.
  }
}