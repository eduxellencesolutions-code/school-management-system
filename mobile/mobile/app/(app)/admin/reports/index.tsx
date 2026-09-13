import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { loadReportsList, ReportListItem } from '../../../../src/lib/supabase/queries/reports'
import { LoadingState, ErrorState, EmptyState, SectionCard } from '../../../../src/components/ui'

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', submitted: 'Awaiting Approval', approved: 'Approved — ready to lock', published: 'Published', archived: 'Archived' }
const STATUS_COLOR: Record<string, string> = { draft: '#666', submitted: '#d97706', approved: '#1E40AF', published: '#16a34a', archived: '#999' }

function ReportRow({ item }: { item: ReportListItem }) {
  return (
    <Pressable style={styles.row} onPress={() => router.push({ pathname: '/(app)/admin/reports/[id]', params: { id: item.id } })}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{item.groupName}</Text>
        <Text style={styles.rowMeta}>Created by {item.createdByName} · {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.statusTag, { color: STATUS_COLOR[item.reportStatus] ?? '#666' }]}>{STATUS_LABEL[item.reportStatus] ?? item.reportStatus}</Text>
    </Pressable>
  )
}

export default function ReportsListScreen() {
  const { profile } = useAuth()
  const [myReports, setMyReports] = useState<ReportListItem[]>([])
  const [pendingApproval, setPendingApproval] = useState<ReportListItem[]>([])
  const [isPrincipal, setIsPrincipal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (profile?.kind !== 'staff' || !profile.organizationId) return
    try {
      setError(null)
      const result = await loadReportsList(profile.id, profile.organizationId, profile.role)
      setMyReports(result.myReports); setPendingApproval(result.pendingApproval); setIsPrincipal(result.isPrincipal)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load reports.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingState label="Loading reports..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable style={styles.generateButton} onPress={() => router.push('/(app)/admin/reports/generate')}>
        <Text style={styles.generateButtonText}>+ Generate New Report</Text>
      </Pressable>

      {isPrincipal && (
        <SectionCard title="Pending Approval">
          {pendingApproval.length === 0 ? <EmptyState message="No reports awaiting your approval." /> : pendingApproval.map((item) => <ReportRow key={item.id} item={item} />)}
        </SectionCard>
      )}

      <SectionCard title={isPrincipal ? 'My Reports' : 'Reports'}>
        {myReports.length === 0 ? <EmptyState message="No reports to display." /> : myReports.map((item) => <ReportRow key={item.id} item={item} />)}
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  generateButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 20 },
  generateButtonText: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  statusTag: { fontSize: 11, fontWeight: '600' },
})