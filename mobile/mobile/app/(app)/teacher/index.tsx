import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadTeacherDashboard, TeacherDashboardData } from '../../../src/lib/supabase/queries/teacher'
import { loadWithCacheFallback } from '../../../src/lib/offline/cache'
import { getQueuedAttendance } from '../../../src/lib/offline/attendanceQueue'
import { StatCard, SectionCard, NavCard, LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

const STATUS_LABELS: Record<string, string> = {
  not_submitted: 'Not yet submitted',
  lecturer_submitted: 'Submitted — awaiting review',
  pending_faculty: 'Under review',
  pending_registry: 'Under review',
  pending_senate: 'Under review',
  senate_approved: 'Approved',
  published: 'Published',
  returned: 'Returned — needs correction',
}

export default function TeacherDashboard() {
  const { profile, signOut } = useAuth()
  const [data, setData] = useState<TeacherDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [staleSince, setStaleSince] = useState<string | null>(null)
  const [pendingSyncCount, setPendingSyncCount] = useState(0)

  const fetchData = useCallback(async () => {
    if (!profile || profile.kind !== 'staff') return
    try {
      setError(null)
      const result = await loadWithCacheFallback(
        `teacher_dashboard:${profile.id}`,
        () => loadTeacherDashboard(profile.id, profile.organizationId)
      )
      setData(result.data)
      setIsStale(result.fromCache)
      setStaleSince(result.cachedAt ?? null)
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong loading your dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    getQueuedAttendance().then((q) => setPendingSyncCount(q.length))
  }, [])

  if (loading) return <LoadingState label="Loading your dashboard..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (!data) return null

  // Parents never reach this screen (routing prevents it) — this guard just
  // satisfies the type system, since ParentProfile has no `organizationId`.
  if (profile?.kind !== 'staff') return null

  const onRefresh = () => { setRefreshing(true); fetchData() }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.orgName}>{data.orgName}</Text>
        </View>
        <Pressable onPress={signOut}><Text style={styles.logout}>Log Out</Text></Pressable>
      </View>

      {isStale && (
        <Text style={styles.staleNotice}>
          Showing saved data from {staleSince ? new Date(staleSince).toLocaleString() : 'earlier'}
        </Text>
      )}

      {data.currentTerm && (
        <Text style={styles.termBanner}>{data.currentTerm.termName} · {data.currentTerm.sessionName}</Text>
      )}

      {pendingSyncCount > 0 && (
        <Text style={styles.pendingSyncNotice}>
          {pendingSyncCount} attendance record(s) saved offline, waiting to sync
        </Text>
      )}

      <View style={styles.statGrid}>
        <StatCard label="My Classes" value={data.classesAsClassTeacher.length} />
        <StatCard label="Subjects Taught" value={data.subjectsTaught.length} />
        <StatCard label="My Students" value={data.studentCount} sublabel="in classes you lead" />
      </View>

      <SectionCard title="My Classes">
        {data.classesAsClassTeacher.length === 0 ? (
          <EmptyState message="You are not assigned as a class teacher for any class." />
        ) : (
          data.classesAsClassTeacher.map((c) => (
            <View key={c.id} style={styles.listRow}>
              <Text style={styles.listRowText}>{c.name}{c.section ? ` · ${c.section}` : ''}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="My Subjects & Result Status">
        {data.subjectsTaught.length === 0 ? (
          <EmptyState message="You are not currently assigned to any subjects." />
        ) : (
          data.subjectsTaught.map((s) => (
            <View key={s.id} style={styles.subjectRow}>
              <View>
                <Text style={styles.listRowText}>{s.name}</Text>
                {s.className && <Text style={styles.subjectClass}>{s.className}</Text>}
              </View>
              <Text style={styles.statusTag}>{STATUS_LABELS[s.submissionStatus] ?? s.submissionStatus}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Recent Notifications">
        {data.notifications.length === 0 ? (
          <EmptyState message="No recent notifications." />
        ) : (
          data.notifications.map((n) => (
            <View key={n.id} style={styles.listRow}>
              <Text style={[styles.listRowText, !n.isRead && styles.unreadText]}>{n.title}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Quick Actions">
        <View style={styles.navGrid}>
          <NavCard label="Enter Scores" comingSoon />
          <NavCard label="Mark Attendance" comingSoon />
          <NavCard label="Homework" comingSoon />
          <NavCard label="Announcements" onPress={() => router.push('/(app)/announcements')} />
          <NavCard label="Notifications" onPress={() => router.push('/(app)/notifications')} />
        </View>
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '700' },
  orgName: { fontSize: 13, color: '#666', marginTop: 2 },
  logout: { color: '#d92d20', fontWeight: '500' },
  staleNotice: { fontSize: 11, color: '#b45309', marginBottom: 8, fontStyle: 'italic' },
  termBanner: { fontSize: 13, color: '#1a56db', marginBottom: 20 },
  pendingSyncNotice: { fontSize: 12, color: '#d97706', marginBottom: 12, fontWeight: '500' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  listRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  listRowText: { fontSize: 14, color: '#333' },
  unreadText: { fontWeight: '700' },
  subjectRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee',
  },
  subjectClass: { fontSize: 12, color: '#999', marginTop: 2 },
  statusTag: { fontSize: 11, color: '#1a56db', fontWeight: '600' },
})