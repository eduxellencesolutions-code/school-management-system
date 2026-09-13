import { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadAttendanceAlerts, AttendanceAlerts } from '../../../src/lib/supabase/queries/attendance'
import { SectionCard, LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function AttendanceAlertsScreen() {
  const { profile } = useAuth()
  const [alerts, setAlerts] = useState<AttendanceAlerts | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || profile.kind !== 'staff') return
    if (!profile.organizationId) return
    loadAttendanceAlerts(profile.organizationId)
      .then(setAlerts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile])

  // Parents never reach this screen (routing prevents it) — this guard just
  // satisfies the type system, since ParentProfile has no `organizationId`.
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading attendance alerts..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (!alerts) return null

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="5+ Consecutive Days Absent">
        {alerts.consecutive5plus.length === 0 ? (
          <EmptyState message="No students currently on a 5+ day absence streak." />
        ) : (
          alerts.consecutive5plus.map((s) => (
            <View key={s.learnerId} style={styles.row}>
              <Text style={styles.name}>{s.firstName} {s.lastName}</Text>
              <Text style={styles.detail}>{s.className ?? '—'} · {s.consecutiveDays} days</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="4+ Absences in Last 14 Days">
        {alerts.repeated2Weeks.length === 0 ? (
          <EmptyState message="No students with repeated absences in the last 2 weeks." />
        ) : (
          alerts.repeated2Weeks.map((s) => (
            <View key={s.learnerId} style={styles.row}>
              <Text style={styles.name}>{s.firstName} {s.lastName}</Text>
              <Text style={styles.detail}>{s.className ?? '—'} · {s.absencesLast14Days} absences</Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Below 80% Overall Attendance">
        {alerts.below80Percent.length === 0 ? (
          <EmptyState message="No students below 80% attendance." />
        ) : (
          alerts.below80Percent.map((s) => (
            <View key={s.learnerId} style={styles.row}>
              <Text style={styles.name}>{s.firstName} {s.lastName}</Text>
              <Text style={styles.detail}>{s.className ?? '—'} · {s.attendancePercentage}%</Text>
            </View>
          ))
        )}
      </SectionCard>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  name: { fontSize: 14, fontWeight: '500' },
  detail: { fontSize: 12, color: '#999', marginTop: 2 },
})