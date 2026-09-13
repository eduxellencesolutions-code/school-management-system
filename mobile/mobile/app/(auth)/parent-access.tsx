import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuth } from '../../src/lib/auth/AuthContext'

export default function ParentAccessScreen() {
  const { signInWithAccessCode, authError, clearAuthError } = useAuth()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (code.trim().length < 4) return
    clearAuthError()
    setSubmitting(true)
    await signInWithAccessCode(code)
    setSubmitting(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parent Access</Text>
      <Text style={styles.subtitle}>Enter your Parent Access Code to view your children's results.</Text>

      <TextInput
        style={styles.input}
        placeholder="e.g. K7M2QX"
        autoCapitalize="characters"
        maxLength={6}
        value={code}
        onChangeText={(text) => { setCode(text.toUpperCase()); if (authError) clearAuthError() }}
        editable={!submitting}
      />

      {authError && <Text style={styles.error}>{authError}</Text>}

      <Pressable style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>View Results</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 28 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 16, fontSize: 22,
    textAlign: 'center', letterSpacing: 4, fontWeight: '700', marginBottom: 12,
  },
  error: { color: '#d92d20', textAlign: 'center', marginBottom: 12, fontSize: 13 },
  button: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})