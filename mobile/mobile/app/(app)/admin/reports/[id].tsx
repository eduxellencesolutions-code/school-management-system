import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { supabase } from '../../../../src/lib/supabase/client'
import { loadReportDetail, submitReport, approveReport, publishReport, unpublishReport, archiveReport, softDeleteReport } from '../../../../src/lib/supabase/queries/reports'
import { LoadingState, ErrorState } from '../../../../src/components/ui'

const STATUS_LABEL: Record<string, string> = { draft: 'Draft', submitted: 'Awaiting Approval', approved: 'Approved', published: 'Published', archived: 'Archived' }

export default function ReportDetailScreen() {
  const { profile } = useAuth()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [report, setReport] = useState<any>(null)
  const [isClassTeacher, setIsClassTeacher] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id || profile?.kind !== 'staff') return
    try {
      setError(null)
      const r = await loadReportDetail(id)
      setReport(r)
      const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'
      if (!isAdmin) {
        const { data } = await supabase.from('teacher_assignments').select('id').eq('teacher_id', profile.id).eq('class_id', r.group_id).eq('role', 'class_teacher').maybeSingle()
        setIsClassTeacher(!!data)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Could not load report.')
    } finally {
      setLoading(false)
    }
  }, [id, profile])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingState label="Loading report..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (!report || profile?.kind !== 'staff') return null

  const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'
  const isPrincipal = profile.role === 'principal'
  const canSubmit = isAdmin || isClassTeacher
  const canApprove = isPrincipal && report.report_status === 'submitted'
  const canPublish = isAdmin
  const canDelete = isAdmin

  const data = report.report_data ?? {}
  const learners: any[] = data.learners ?? []
  const subjects: any[] = data.subjects ?? []
  const group = report.group

  async function runAction(action: () => Promise<void>, successMessage: string) {
    setBusy(true)
    try { await action(); Alert.alert('Success', successMessage); fetchData() }
    catch (e: any) { Alert.alert('Error', e?.message ?? 'Action failed.') }
    finally { setBusy(false) }
  }

  function handleDelete() {
    Alert.alert('Delete report', 'This will move the report to trash. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => runAction(() => softDeleteReport(id!, profile.id), 'Report deleted.').then(() => router.back()) },
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{group?.name}</Text>
        <Text style={styles.statusTag}>{STATUS_LABEL[report.report_status] ?? report.report_status}</Text>
      </View>
      <Text style={styles.subtitle}>{learners.length} students · {subjects.length} subjects</Text>

      {report.report_status === 'published' && (
        <View style={styles.noticeGreen}><Text style={styles.noticeText}>This report is published and locked.</Text></View>
      )}
      {report.report_status === 'submitted' && !isPrincipal && (
        <View style={styles.noticeAmber}><Text style={styles.noticeText}>Awaiting approval from the principal.</Text></View>
      )}

      <ScrollView horizontal style={{ marginVertical: 16 }}>
        <View>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.nameCol]}>Student</Text>
            {subjects.map((s) => <Text key={s.id} style={[styles.th, styles.numCol]}>{s.name}</Text>)}
            <Text style={[styles.th, styles.numCol]}>Total</Text>
            <Text style={[styles.th, styles.numCol]}>Avg</Text>
            <Text style={[styles.th, styles.numCol]}>Grd</Text>
            <Text style={[styles.th, styles.numCol]}>Pos</Text>
          </View>
          {learners.map((l) => (
            <View key={l.learner_id} style={styles.tableRow}>
              <Text style={[styles.td, styles.nameCol]}>{l.last_name} {l.first_name}</Text>
              {subjects.map((s) => {
                const detail = (l.subject_details ?? []).find((d: any) => d.subject_id === s.id)
                return <Text key={s.id} style={[styles.td, styles.numCol]}>{detail?.total ?? '—'}</Text>
              })}
              <Text style={[styles.td, styles.numCol, { fontWeight: '700' }]}>{l.overall_total}</Text>
              <Text style={[styles.td, styles.numCol]}>{l.average}</Text>
              <Text style={[styles.td, styles.numCol, { fontWeight: '700' }]}>{l.grade}</Text>
              <Text style={[styles.td, styles.numCol]}>{l.position}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actions}>
        {canSubmit && report.report_status === 'draft' && (
          <Pressable style={styles.actionButton} onPress={() => runAction(() => submitReport(id!), 'Submitted for approval.')} disabled={busy}>
            <Text style={styles.actionButtonText}>Submit for Approval</Text>
          </Pressable>
        )}
        {canApprove && (
          <Pressable style={styles.actionButton} onPress={() => runAction(() => approveReport(id!), 'Report approved.')} disabled={busy}>
            <Text style={styles.actionButtonText}>Approve</Text>
          </Pressable>
        )}
        {canPublish && report.report_status === 'approved' && (
          <Pressable style={styles.actionButton} onPress={() => runAction(() => publishReport(id!), 'Report published.')} disabled={busy}>
            <Text style={styles.actionButtonText}>Publish Report</Text>
          </Pressable>
        )}
        {canPublish && report.report_status === 'published' && (
          <Pressable style={styles.actionButtonSecondary} onPress={() => runAction(() => unpublishReport(id!), 'Report unlocked.')} disabled={busy}>
            <Text style={styles.actionButtonSecondaryText}>Unlock Report</Text>
          </Pressable>
        )}
        {canDelete && (
          <>
            <Pressable style={styles.actionButtonSecondary} onPress={() => runAction(() => archiveReport(id!), 'Report archived.')} disabled={busy}>
              <Text style={styles.actionButtonSecondaryText}>Archive</Text>
            </Pressable>
            <Pressable style={styles.deleteButton} onPress={handleDelete} disabled={busy}>
              <Text style={styles.deleteButtonText}>Delete Report</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.note}>PDF download and student remarks editing are not yet available in the mobile app — use the web app for those.</Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  statusTag: { fontSize: 11, fontWeight: '700', color: '#1a56db', backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  subtitle: { fontSize: 12, color: '#999', marginTop: 4 },
  noticeGreen: { backgroundColor: '#dcfce7', borderRadius: 8, padding: 10, marginTop: 12 },
  noticeAmber: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginTop: 12 },
  noticeText: { fontSize: 12, color: '#333' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5' },
  th: { fontSize: 10, fontWeight: '700', color: '#666', padding: 6, textAlign: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  td: { fontSize: 11, padding: 6, textAlign: 'center' },
  nameCol: { width: 130, textAlign: 'left' },
  numCol: { width: 60 },
  actions: { gap: 10, marginTop: 8 },
  actionButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  actionButtonText: { color: '#fff', fontWeight: '600' },
  actionButtonSecondary: { borderWidth: 1, borderColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  actionButtonSecondaryText: { color: '#1a56db', fontWeight: '600' },
  deleteButton: { padding: 14, alignItems: 'center' },
  deleteButtonText: { color: '#d92d20', fontWeight: '600' },
  note: { fontSize: 11, color: '#999', marginTop: 20, textAlign: 'center' },
})