import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadClassLockSummaries, checkLockReadiness, confirmLock, ClassLockSummary } from '../../../src/lib/supabase/queries/lockResults'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function LockResultsScreen() {
  const { profile } = useAuth()
  const [summaries, setSummaries] = useState<ClassLockSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checkingId, setCheckingId] = useState<string | null>(null)
  const [readyId, setReadyId] = useState<string | null>(null)
  const [problems, setProblems] = useState<string[]>([])
  const [lockingId, setLockingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile || profile.kind !== 'staff' || !profile.organizationId) return
    try {
      setError(null)
      setSummaries(await loadClassLockSummaries(profile.organizationId))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load classes.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCheck(item: ClassLockSummary) {
    if (!item.sessionId || !item.termId) return
    setCheckingId(item.groupId)
    setReadyId(null)
    setProblems([])
    try {
      const result = await checkLockReadiness(item.groupId, item.sessionId, item.termId)
      if (result.ready) setReadyId(item.groupId)
      else setProblems(result.problems ?? ['This class is not ready to be locked.'])
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setCheckingId(null)
    }
  }

  async function handleConfirmLock(item: ClassLockSummary) {
    if (!item.sessionId || !item.termId) return
    setLockingId(item.groupId)
    try {
      await confirmLock(item.groupId, item.sessionId, item.termId)
      setReadyId(null)
      fetchData()
    } catch (e: any) {
      Alert.alert('Error', e.message)
    } finally {
      setLockingId(null)
    }
  }

  if (loading) return <LoadingState label="Loading classes..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (summaries.length === 0) return <EmptyState message="No classes found for your organization." />

  return (
    <FlatList
      data={summaries}
      keyExtractor={(item) => item.groupId}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.className}>{item.groupName}</Text>

          {!item.reportId && <Text style={styles.hint}>No broadsheet generated yet</Text>}

          {item.reportId && (
            <View style={styles.statusRow}>
              <Text style={[styles.statusTag, item.locked ? styles.statusLocked : item.reportStatus === 'published' ? styles.statusPublished : styles.statusOther]}>
                {item.locked ? 'Locked' : item.reportStatus}
              </Text>
              {item.locked && item.lockedAt && <Text style={styles.hint}>Locked {new Date(item.lockedAt).toLocaleDateString()}</Text>}
            </View>
          )}

          {item.reportId && item.locked && <Text style={styles.finalizedText}>✓ Finalized</Text>}

          {item.reportId && !item.locked && item.reportStatus !== 'published' && (
            <Text style={styles.notPublishedText}>Not yet published</Text>
          )}

          {item.reportId && !item.locked && item.reportStatus === 'published' && (
            <View style={{ marginTop: 10 }}>
              {readyId === item.groupId ? (
                <>
                  <Text style={styles.readyText}>✓ All checks passed</Text>
                  <Pressable style={styles.lockButton} onPress={() => handleConfirmLock(item)} disabled={lockingId === item.groupId}>
                    <Text style={styles.lockButtonText}>{lockingId === item.groupId ? 'Locking...' : 'Confirm Lock'}</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  {problems.length > 0 && checkingId !== item.groupId && (
                    <View style={styles.problemsBox}>
                      {problems.map((p, i) => <Text key={i} style={styles.problemText}>• {p}</Text>)}
                    </View>
                  )}
                  <Pressable style={styles.checkButton} onPress={() => handleCheck(item)} disabled={checkingId === item.groupId}>
                    <Text style={styles.checkButtonText}>{checkingId === item.groupId ? 'Checking...' : 'Check Readiness'}</Text>
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginBottom: 12 },
  className: { fontSize: 15, fontWeight: '600' },
  hint: { fontSize: 11, color: '#999', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusTag: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusLocked: { backgroundColor: '#dcfce7', color: '#166534' },
  statusPublished: { backgroundColor: '#dbeafe', color: '#1e40af' },
  statusOther: { backgroundColor: '#f3f4f6', color: '#666' },
  finalizedText: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 8 },
  notPublishedText: { fontSize: 12, color: '#d97706', fontWeight: '600', marginTop: 8 },
  readyText: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginBottom: 8 },
  problemsBox: { marginBottom: 8 },
  problemText: { fontSize: 11, color: '#d92d20', marginBottom: 2 },
  checkButton: { borderWidth: 1, borderColor: '#1a56db', borderRadius: 6, padding: 10, alignItems: 'center' },
  checkButtonText: { color: '#1a56db', fontWeight: '600', fontSize: 12 },
  lockButton: { backgroundColor: '#1a56db', borderRadius: 6, padding: 10, alignItems: 'center' },
  lockButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
})