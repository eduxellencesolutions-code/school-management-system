import { View, Text, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'

export default function AuthEntry() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eduxellence Results</Text>
      <Pressable style={styles.button} onPress={() => router.push('/(auth)/login')}>
        <Text style={styles.buttonText}>Staff Login</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.buttonSecondary]} onPress={() => router.push('/(auth)/parent-access')}>
        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Parent Access Code</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 32 },
  button: { backgroundColor: '#1a56db', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonSecondary: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#1a56db' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonTextSecondary: { color: '#1a56db' },
})