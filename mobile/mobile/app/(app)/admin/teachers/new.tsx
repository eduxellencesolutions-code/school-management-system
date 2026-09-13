import { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native'
import { router } from 'expo-router'
import { createTeacherAccount } from '../../../../src/lib/supabase/queries/addTeacher'

const ROLES = [
  { value: 'teacher', label: 'Teacher' },
  { value: 'lecturer', label: 'Lecturer' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'principal', label: 'Principal' },
]

export default function AddTeacherScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'teacher' | 'lecturer' | 'assistant' | 'principal'>('teacher')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Missing information', 'Name, email, and password are required.')
      return
    }
    setSaving(true)
    try {
      const result = await createTeacherAccount({ name, email, phone: phone || undefined, role, password })
      Alert.alert('Teacher Added', `${result.teacherName}'s account has been created. Share their login email and password with them.`, [
        { text: 'OK', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not add teacher.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Full Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Jane Doe" />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="teacher@school.com" autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>Phone (optional)</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="08012345678" keyboardType="phone-pad" />

      <Text style={styles.label}>Temporary Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Set an initial password" secureTextEntry />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <Pressable key={r.value} style={[styles.roleChip, role === r.value && styles.roleChipActive]} onPress={() => setRole(r.value as any)}>
            <Text style={[styles.roleChipText, role === r.value && styles.roleChipTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.hint}>
        Class and subject assignments can be set up afterward from the Teachers list. This screen only creates the account.
      </Text>

      <Pressable style={[styles.submitButton, saving && { opacity: 0.6 }]} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitButtonText}>{saving ? 'Creating...' : 'Create Teacher Account'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 14 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: '#f0f0f0' },
  roleChipActive: { backgroundColor: '#1a56db' },
  roleChipText: { fontSize: 12, color: '#666' },
  roleChipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 11, color: '#999', marginTop: 16, marginBottom: 20 },
  submitButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: '600' },
})