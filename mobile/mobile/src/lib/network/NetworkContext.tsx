import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import NetInfo from '@react-native-community/netinfo'

interface NetworkContextValue {
  isOnline: boolean
}

const NetworkContext = createContext<NetworkContextValue>({ isOnline: true })

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected can be true while isInternetReachable is still resolving (null) —
      // treat "not explicitly false" as online to avoid false offline flashes on launch.
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false)
    })
    return () => unsubscribe()
  }, [])

  return <NetworkContext.Provider value={{ isOnline }}>{children}</NetworkContext.Provider>
}

export function useNetwork() {
  return useContext(NetworkContext)
}