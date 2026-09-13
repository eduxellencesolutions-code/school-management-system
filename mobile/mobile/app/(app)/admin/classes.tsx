import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadClasses, ClassListItem } from '../../../src/lib/supabase/queries/classes'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function ClassesScreen() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<ClassListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile?.organizationId) return
    try {
      setError(null)
      const result = await loadClasses(profile.id, profile.role, profile.organizationId)
      setClasses(result.classes)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load classes.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingState label="Loading classes..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (classes.length === 0) return <EmptyState message="No classes found." />

  return (
    <FlatList
      data={classes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} />}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.badge}><Text style={styles.badgeText}>{item.name.slice(0, 2).toUpperCase()}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.className}>{item.name}</Text>
              {item.code && <Text style={styles.classCode}>{item.code}</Text>}
            </View>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{item.learnerCount} student{item.learnerCount !== 1 ? 's' : ''}</Text>
            <Text style={styles.stat}>{item.subjectCount} subject{item.subjectCount !== 1 ? 's' : ''}</Text>
          </View>
          {item.teacherName && <Text style={styles.teacher}>Teacher: {item.teacherName}</Text>}
          {item.sessionName && <Text style={styles.term}>{item.sessionName}{item.termName ? ` · ${item.termName}` : ''}</Text>}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  badge: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#1a56db' },
  className: { fontSize: 15, fontWeight: '600' },
  classCode: { fontSize: 11, color: '#999' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 6 },
  stat: { fontSize: 12, color: '#666' },
  teacher: { fontSize: 12, color: '#666' },
  term: { fontSize: 11, color: '#999', marginTop: 2 },
})