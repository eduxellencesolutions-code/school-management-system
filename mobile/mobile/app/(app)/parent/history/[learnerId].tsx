import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { loadChildHistory, HistoryEntry } from '../../../../src/lib/supabase/queries/parentHistory'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'

export default function ChildHistory() {
  const { learnerId } = useLocalSearchParams<{ learnerId: string }>()
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) return
    loadChildHistory(learnerId).then(setHistory).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [learnerId])

  if (loading) return <LoadingState label="Loading academic history..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (history.length === 0) return <EmptyState message="No academic history recorded yet." />

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.sessionName ?? '—'} · {item.className ?? '—'}</Text>
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, item.status === 'promoted' ? styles.badgeGreen : item.status === 'repeated' ? styles.badgeAmber : styles.badgeGray]}>{item.status}</Text>
              {item.promotedToClassName && <Text style={styles.arrow}>→ {item.promotedToClassName}</Text>}
            </View>
          </View>
          {item.average !== null && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.average}>{item.average}%</Text>
              {item.position && <Text style={styles.position}>Position {item.position}</Text>}
            </View>
          )}
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 14, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  badge: { fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  badgeGreen: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeAmber: { backgroundColor: '#fef3c7', color: '#92400e' },
  badgeGray: { backgroundColor: '#f3f4f6', color: '#666' },
  arrow: { fontSize: 11, color: '#999' },
  average: { fontSize: 14, fontWeight: '700' },
  position: { fontSize: 11, color: '#999' },
})