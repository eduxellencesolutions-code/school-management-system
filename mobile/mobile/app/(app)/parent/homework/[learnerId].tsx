import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { loadChildHomework, HomeworkAssignment } from '../../../../src/lib/supabase/queries/parentHomework'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'

const STATUS_LABEL: Record<string, string> = { submitted: 'Submitted', late: 'Late', not_submitted: 'Not Submitted' }
const STATUS_COLOR: Record<string, string> = { submitted: '#16a34a', late: '#d97706', not_submitted: '#999' }

export default function ChildHomework() {
  const { learnerId } = useLocalSearchParams<{ learnerId: string }>()
  const [assignments, setAssignments] = useState<HomeworkAssignment[]>([])
  const [featureDisabled, setFeatureDisabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!learnerId) return
    loadChildHomework(learnerId)
      .then((r) => { setAssignments(r.assignments); setFeatureDisabled(r.featureDisabled) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [learnerId])

  if (loading) return <LoadingState label="Loading homework..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (featureDisabled) return <EmptyState message="Homework tracking is not enabled for this school." />
  if (assignments.length === 0) return <EmptyState message="No homework assignments recorded yet." />

  const total = assignments.length
  const submitted = assignments.filter((a) => a.status === 'submitted').length
  const late = assignments.filter((a) => a.status === 'late').length
  const missed = assignments.filter((a) => a.status === 'not_submitted').length

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.summary}>
        <View style={styles.summaryItem}><Text style={styles.summaryNum}>{total}</Text><Text style={styles.summaryLabel}>Total</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryNum, { color: '#16a34a' }]}>{submitted}</Text><Text style={styles.summaryLabel}>Submitted</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryNum, { color: '#d97706' }]}>{late}</Text><Text style={styles.summaryLabel}>Late</Text></View>
        <View style={styles.summaryItem}><Text style={[styles.summaryNum, { color: '#d92d20' }]}>{missed}</Text><Text style={styles.summaryLabel}>Missed</Text></View>
      </View>
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.subjectName ?? '—'} · Due {new Date(item.dueDate).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.badge, { color: STATUS_COLOR[item.status] }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 18, fontWeight: '700' },
  summaryLabel: { fontSize: 10, color: '#999', marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 11, color: '#999', marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '600' },
})