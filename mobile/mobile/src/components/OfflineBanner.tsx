import { View, Text, StyleSheet } from 'react-native'
import { useNetwork } from '../lib/network/NetworkContext'

export function OfflineBanner() {
  const { isOnline } = useNetwork()
  if (isOnline) return null

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection — showing saved data where available</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#7c2d12', paddingVertical: 6, paddingHorizontal: 12 },
  text: { color: '#fff', fontSize: 11, textAlign: 'center', fontWeight: '500' },
})