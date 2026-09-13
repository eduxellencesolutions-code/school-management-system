import { useEffect, useRef } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { AppState } from 'react-native'
import { processAttendanceQueue } from './attendanceQueue'

export function SyncManager() {
  const wasOffline = useRef(false)

  useEffect(() => {
    const netUnsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false
      if (online && wasOffline.current) {
        processAttendanceQueue() // fire-and-forget; UI screens re-check the queue themselves when opened
      }
      wasOffline.current = !online
    })

    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') processAttendanceQueue()
    })

    return () => {
      netUnsubscribe()
      appStateSubscription.remove()
    }
  }, [])

  return null
}