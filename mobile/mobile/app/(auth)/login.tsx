import { useState } from 'react'
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useAuth } from '../../src/lib/auth/AuthContext'

export default function LoginScreen() {
  const { signIn, authError, clearAuthError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Visual-only toggle: the actual form is identical for staff and students —
  // what kind of session comes back is decided by loadProfile in AuthContext.
  // This just relabels the screen so the person knows they're in the right place.
  const [mode, setMode] = useState<'staff' | 'student'>('staff')

  async function handleLogin() {
    if (!email.trim() || !password) {
      return
    }
    clearAuthError()
    setSubmitting(true)
    await signIn(email, password)
    setSubmitting(false)
    // On success, AuthContext's session change triggers the redirect in
    // RootLayout automatically — no navigation call needed here.
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Eduxellence Results</Text>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modeButton, mode === 'staff' && styles.modeButtonActive]}
          onPress={() => { setMode('staff'); if (authError) clearAuthError() }}
          disabled={submitting}
        >
          <Text style={[styles.modeText, mode === 'staff' && styles.modeTextActive]}>Staff</Text>
        </Pressable>
        <Pressable
          style={[styles.modeButton, mode === 'student' && styles.modeButtonActive]}
          onPress={() => { setMode('student'); if (authError) clearAuthError() }}
          disabled={submitting}
        >
          <Text style={[styles.modeText, mode === 'student' && styles.modeTextActive]}>Student</Text>
        </Pressable>
      </View>

      <Text style={styles.subtitle}>
        {mode === 'staff' ? 'Staff Login' : 'Student Login'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          if (authError) clearAuthError()
        }}
        editable={!submitting}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={(text) => {
          setPassword(text)
          if (authError) clearAuthError()
        }}
        editable={!submitting}
      />

      {authError && <Text style={styles.error}>{authError}</Text>}

      <Pressable
        style={[styles.button, submitting && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={submitting}
      >
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeButton: {
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modeButtonActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#1a56db',
  },
  modeText: { fontSize: 13, fontWeight: '500', color: '#666' },
  modeTextActive: { color: '#1a56db', fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14,
    marginBottom: 12, fontSize: 16,
  },
  error: { color: '#d92d20', marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#1a56db', borderRadius: 8, padding: 14,
    alignItems: 'center', marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})