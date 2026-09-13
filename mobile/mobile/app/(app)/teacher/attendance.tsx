import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadClassRosterForDate, submitAttendance, RosterEntry } from '../../../src/lib/supabase/queries/attendance'
import { useNetwork } from '../../../src/lib/network/NetworkContext'
import { enqueueAttendance } from '../../../src/lib/offline/attendanceQueue'
import { LoadingState, ErrorState } from '../../../src/components/ui'

const TODAY = new Date().toISOString().split('T')[0]
const STATUS_OPTIONS: RosterEntry['status'][] = ['present', 'absent', 'late']

export default function MarkAttendance() {
  const { profile } = useAuth()
  const { isOnline } = useNetwork()
  const { groupId, groupName, termId, sessionId } = useLocalSearchParams<{
    groupId: string; groupName: string; termId: string; sessionId: string
  }>()
  const [roster, setRoster] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!groupId) return
    loadClassRosterForDate(groupId, TODAY)
      .then(setRoster)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [groupId])

  function setStatus(learnerId: string, status: RosterEntry['status']) {
    setRoster((prev) => prev.map((r) => (r.learnerId === learnerId ? { ...r, status } : r)))
  }

  async function handleSubmit() {
    const unmarked = roster.filter((r) => !r.status)
    if (unmarked.length > 0) {
      Alert.alert(
        'Incomplete',
        `${unmarked.length} student(s) are not marked yet. Mark all students before saving.`
      )
      return
    }
    if (!profile || profile.kind !== 'staff' || !profile.organizationId || !termId || !sessionId || !groupId) {
      Alert.alert('Error', 'Missing required information. Please go back and try again.')
      return
    }

    setSaving(true)
    try {
      if (!isOnline) {
        await enqueueAttendance({
          organizationId: profile.organizationId, groupId, groupName: groupName ?? 'Class',
          termId, sessionId, date: TODAY,
          entries: roster.map((r) => ({ learnerId: r.learnerId, status: r.status! })),
        })
        Alert.alert('Saved Offline', 'No internet connection — attendance has been saved on this device and will sync automatically once you\'re back online.', [
          { text: 'OK', onPress: () => router.back() },
        ])
        return
      }

      await submitAttendance({
        organizationId: profile.organizationId, groupId, termId, sessionId, date: TODAY,
        entries: roster.map((r) => ({ learnerId: r.learnerId, status: r.status! })),
      })
      Alert.alert('Saved', 'Attendance recorded successfully.', [{ text: 'OK', onPress: () => router.back() }])
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save attendance.')
    } finally {
      setSaving(false)
    }
  }

  // Parents never reach this screen (routing prevents it) — this guard just
  // satisfies the type system, since ParentProfile has no `organizationId`.
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading class roster..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{groupName}</Text>
        <Text style={styles.date}>{TODAY}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {roster.map((r) => (
          <View key={r.learnerId} style={styles.row}>
            <View style={styles.nameCol}>
              <Text style={styles.name}>{r.firstName} {r.lastName}</Text>
              {r.admissionNumber && <Text style={styles.admNo}>{r.admissionNumber}</Text>}
            </View>
            <View style={styles.statusButtons}>
              {STATUS_OPTIONS.map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.statusButton,
                    r.status === s && styles[`statusButton_${s}` as const],
                  ]}
                  onPress={() => setStatus(r.learnerId, s)}
                >
                  <Text style={[styles.statusButtonText, r.status === s && styles.statusButtonTextActive]}>
                    {s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <Pressable style={[styles.submitButton, saving && styles.submitDisabled]} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitText}>{saving ? 'Saving...' : 'Save Attendance'}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
  date: { fontSize: 13, color: '#666', marginTop: 2 },
  list: { padding: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  nameCol: { flex: 1 },
  name: { fontSize: 14, fontWeight: '500' },
  admNo: { fontSize: 11, color: '#999' },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusButton: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#ddd',
    justifyContent: 'center', alignItems: 'center',
  },
  statusButton_present: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  statusButton_absent: { backgroundColor: '#d92d20', borderColor: '#d92d20' },
  statusButton_late: { backgroundColor: '#d97706', borderColor: '#d97706' },
  statusButtonText: { fontSize: 13, fontWeight: '700', color: '#666' },
  statusButtonTextActive: { color: '#fff' },
  submitButton: { margin: 16, backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  submitDisabled: { opacity: 0.6 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})