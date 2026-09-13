import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadAdminDashboard, AdminDashboardData } from '../../../src/lib/supabase/queries/admin'
import { loadWithCacheFallback } from '../../../src/lib/offline/cache'
import { StatCard, SectionCard, NavCard, LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function AdminDashboard() {
  const { profile, signOut } = useAuth()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [staleSince, setStaleSince] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (profile?.kind !== 'staff' || !profile.organizationId) {
      setError('Your account is not linked to a school yet. Please contact support.')
      setLoading(false)
      return
    }
    try {
      setError(null)
      const result = await loadWithCacheFallback(
        `admin_dashboard:${profile.organizationId}`,
        () => loadAdminDashboard(profile.organizationId!, profile.id)
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

  if (profile?.kind !== 'staff') return null
  if (loading) return <LoadingState label="Loading your school dashboard..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (!data) return null

  const onRefresh = () => { setRefreshing(true); fetchData() }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.schoolName}>{data.org.name}</Text>
          <Text style={styles.welcome}>Welcome back, {profile.name}</Text>
        </View>
        <Pressable onPress={signOut}><Text style={styles.logout}>Log Out</Text></Pressable>
      </View>

      {isStale && (
        <Text style={styles.staleNotice}>
          Showing saved data from {staleSince ? new Date(staleSince).toLocaleString() : 'earlier'}
        </Text>
      )}

      {data.currentTerm ? (
        <Text style={styles.termBanner}>{data.currentTerm.termName} · {data.currentTerm.sessionName}</Text>
      ) : (
        <Text style={styles.termBannerWarn}>No active academic term set yet</Text>
      )}

      <SectionCard title="School Overview">
        <View style={styles.statGrid}>
          <StatCard label="Students" value={data.overview.totalStudents} />
          <StatCard label="Teachers" value={data.totalTeachers} />
          <StatCard label="Classes" value={data.overview.totalClasses} />
          <StatCard
            label="Attendance Today"
            value={data.overview.attendanceToday != null ? `${data.overview.attendanceToday}%` : '—'}
          />
        </View>
      </SectionCard>

      <SectionCard title="Result Approvals">
        {data.pendingApprovals.count === 0 ? (
          <EmptyState message="No results awaiting your approval." />
        ) : (
          <>
            <Text style={styles.approvalCount}>{data.pendingApprovals.count} result(s) awaiting approval</Text>
            {data.pendingApprovals.items.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <Text style={styles.listRowText}>{item.className ?? 'Unnamed class'}</Text>
              </View>
            ))}
          </>
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

      <SectionCard title="Account">
        <Text style={styles.accountLine}>
          Plan: {data.org.subscriptionPlan ?? 'Not set'} · Status: {data.org.subscriptionStatus ?? 'Unknown'}
        </Text>
        {data.org.subscriptionExpiresAt && (
          <Text style={styles.accountLine}>
            Renews/expires: {new Date(data.org.subscriptionExpiresAt).toLocaleDateString()}
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Manage School">
        <View style={styles.navGrid}>
          <NavCard label="Students" onPress={() => router.push('/(app)/admin/students')} />
          <NavCard label="Classes" onPress={() => router.push('/(app)/admin/classes')} />
          <NavCard label="Subjects" onPress={() => router.push('/(app)/admin/subjects')} />
          <NavCard label="Attendance Alerts" onPress={() => router.push('/(app)/admin/attendance-alerts')} />
          <NavCard label="Academic Periods" onPress={() => router.push('/(app)/admin/academic-periods')} />
          <NavCard label="Teachers" onPress={() => router.push('/(app)/admin/teachers')} />
          <NavCard label="School Profile" onPress={() => router.push('/(app)/admin/school-profile')} />
          <NavCard label="Lock Results" onPress={() => router.push('/(app)/admin/lock-results')} />
        </View>
      </SectionCard>

      <SectionCard title="Communication">
        <View style={styles.navGrid}>
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
  schoolName: { fontSize: 20, fontWeight: '700' },
  welcome: { fontSize: 13, color: '#666', marginTop: 2 },
  logout: { color: '#d92d20', fontWeight: '500' },
  staleNotice: { fontSize: 11, color: '#b45309', marginBottom: 8, fontStyle: 'italic' },
  termBanner: { fontSize: 13, color: '#1a56db', marginBottom: 20 },
  termBannerWarn: { fontSize: 13, color: '#b45309', marginBottom: 20 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  navGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  approvalCount: { fontSize: 13, color: '#1a1a1a', marginBottom: 8, fontWeight: '500' },
  listRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  listRowText: { fontSize: 14, color: '#333' },
  unreadText: { fontWeight: '700' },
  accountLine: { fontSize: 13, color: '#666', marginBottom: 4 },
})