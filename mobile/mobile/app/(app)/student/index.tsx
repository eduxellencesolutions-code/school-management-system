import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Pressable } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadMyReportCard } from '../../../src/lib/supabase/queries/studentReport'
import { ChildReportCard } from '../../../src/lib/supabase/queries/parentReport'
import { ReportCardView } from '../../../src/components/ReportCardView'
import { LoadingState, ErrorState } from '../../../src/components/ui'
import { loadWithCacheFallback } from '../../../src/lib/offline/cache'

export default function StudentHome() {
  const { profile, signOut } = useAuth()
  const [data, setData] = useState<ChildReportCard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const [staleSince, setStaleSince] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.kind !== 'student') return
    loadWithCacheFallback(
      `report_card:student:${profile.learnerId}`,
      () => loadMyReportCard()
    )
      .then((result) => {
        setData(result.data)
        setIsStale(result.fromCache)
        setStaleSince(result.cachedAt ?? null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile])

  if (profile?.kind !== 'student') return null

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <Text style={styles.title}>My Results</Text>
        <Pressable onPress={signOut}><Text style={styles.logout}>Log Out</Text></Pressable>
      </View>
      {loading ? (
        <LoadingState label="Loading your results..." />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
      ) : data ? (
        <>
          {isStale && (
            <Text style={styles.staleNotice}>
              Showing saved data from {staleSince ? new Date(staleSince).toLocaleString() : 'earlier'}
            </Text>
          )}
          <ReportCardView data={data} />
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
  logout: { color: '#d92d20', fontWeight: '500' },
  staleNotice: { fontSize: 11, color: '#b45309', marginHorizontal: 16, marginTop: 8, fontStyle: 'italic' },
})