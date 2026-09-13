import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { supabase } from '../../../../src/lib/supabase/client'
import { LoadingState, ErrorState, SectionCard } from '../../../../src/components/ui'

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [learner, setLearner] = useState<any>(null)
  const [linkedParents, setLinkedParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activating, setActivating] = useState(false)

  const fetchData = useCallback(async () => {
    if (!id) return
    try {
      setError(null)
      const { data, error } = await supabase
        .from('learners')
        .select('*, group:groups!learners_group_id_fkey(id, name, code)')
        .eq('id', id).single()
      if (error || !data) throw new Error('Student not found.')
      setLearner(data)

      const { data: links } = await supabase
        .from('parent_learner_links')
        .select('parent:parent_accounts(id, full_name, phone, email, access_code_active)')
        .eq('learner_id', id)
      setLinkedParents((links ?? []).map((l: any) => l.parent).filter(Boolean))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load student.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleActivatePortal() {
    Alert.alert('Activate Student Portal', 'This will create login credentials for this student. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: async () => {
        setActivating(true)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const res = await fetch('https://results.eduxellence.org/api/students/create-portal-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
            body: JSON.stringify({ learnerId: id }),
          })
          const result = await res.json()
          if (result.error) throw new Error(result.error)
          Alert.alert(
            'Portal Activated',
            `Login email: ${result.login_email}\nPassword: ${result.initial_password}\n\nThis will not be shown again — share it with the student now.`
          )
          fetchData()
        } catch (e: any) {
          Alert.alert('Error', e?.message ?? 'Could not activate portal.')
        } finally {
          setActivating(false)
        }
      }},
    ])
  }

  if (loading) return <LoadingState label="Loading student..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (!learner) return null

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{learner.first_name[0]}{learner.last_name[0]}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{learner.last_name} {learner.first_name}</Text>
          <Text style={styles.meta}>{learner.admission_number ?? 'No adm. no.'} · {learner.group?.name ?? 'No class'}</Text>
        </View>
      </View>

      <SectionCard title="Student Portal">
        {learner.portal_status === 'active' ? (
          <Text style={styles.portalActive}>Portal is active</Text>
        ) : (
          <>
            <Text style={styles.portalInactive}>This student does not have portal access yet.</Text>
            <Pressable style={styles.activateButton} onPress={handleActivatePortal} disabled={activating}>
              <Text style={styles.activateButtonText}>{activating ? 'Activating...' : 'Activate Student Portal'}</Text>
            </Pressable>
          </>
        )}
      </SectionCard>

      <SectionCard title="Parent/Guardian">
        {linkedParents.length === 0 ? (
          <Text style={styles.emptyText}>No parent linked yet. Use the web app to link a parent.</Text>
        ) : (
          linkedParents.map((p) => (
            <View key={p.id} style={styles.parentRow}>
              <Text style={styles.parentName}>{p.full_name}</Text>
              <Text style={styles.parentMeta}>{p.email ?? p.phone ?? '—'} · {p.access_code_active ? 'Active' : 'Revoked'}</Text>
            </View>
          ))
        )}
      </SectionCard>

      <Pressable style={styles.scoresButton} onPress={() => router.push({ pathname: '/(app)/teacher/scores', params: { groupId: learner.group_id } })}>
        <Text style={styles.scoresButtonText}>View/Enter Scores</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1a56db' },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 12, color: '#999', marginTop: 2 },
  portalActive: { fontSize: 13, color: '#16a34a', fontWeight: '600' },
  portalInactive: { fontSize: 13, color: '#999', marginBottom: 10 },
  activateButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 12, alignItems: 'center' },
  activateButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  emptyText: { fontSize: 12, color: '#999' },
  parentRow: { paddingVertical: 6 },
  parentName: { fontSize: 13, fontWeight: '600' },
  parentMeta: { fontSize: 11, color: '#999', marginTop: 2 },
  scoresButton: { borderWidth: 1, borderColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  scoresButtonText: { color: '#1a56db', fontWeight: '600' },
})