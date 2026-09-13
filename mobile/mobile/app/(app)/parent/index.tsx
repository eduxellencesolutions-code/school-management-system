import { useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadLinkedChildren, LinkedChild } from '../../../src/lib/supabase/queries/parent'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function ParentHome() {
  const { profile, signOut } = useAuth()
  const [children, setChildren] = useState<LinkedChild[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadLinkedChildren()
      .then(setChildren)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (profile?.kind !== 'parent') return null
  if (loading) return <LoadingState label="Loading your children..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome, {profile.fullName}</Text>
        <Pressable onPress={signOut}><Text style={styles.logout}>Log Out</Text></Pressable>
      </View>

      {children.length === 0 ? (
        <EmptyState message="No children are linked to your account yet. Contact your school." />
      ) : (
        <FlatList
          data={children}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push({ pathname: '/(app)/parent/report/[learnerId]', params: { learnerId: item.id } })}
            >
              <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.meta}>{item.className ?? 'No class assigned'} · {item.admissionNumber ?? 'No adm. no.'}</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Pressable onPress={() => router.push({ pathname: '/(app)/parent/fees/[learnerId]', params: { learnerId: item.id } })}>
                  <Text style={styles.linkText}>Fees</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/(app)/parent/homework/[learnerId]', params: { learnerId: item.id } })}>
                  <Text style={styles.linkText}>Homework</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: '/(app)/parent/history/[learnerId]', params: { learnerId: item.id } })}>
                  <Text style={styles.linkText}>History</Text>
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
  logout: { color: '#d92d20', fontWeight: '500' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginBottom: 10 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, color: '#999', marginTop: 4 },
  linkText: { fontSize: 12, color: '#1a56db', fontWeight: '500' },
})