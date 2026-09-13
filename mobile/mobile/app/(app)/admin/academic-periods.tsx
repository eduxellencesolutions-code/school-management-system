import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import {
  loadAcademicPeriods, createSession, createTerm, setCurrentTerm,
  closeTermRpc, closeSessionRpc, archiveTerm, archiveSession, AcademicSession, Term,
} from '../../../src/lib/supabase/queries/academicPeriods'
import { LoadingState, ErrorState, SectionCard, EmptyState } from '../../../src/components/ui'

export default function AcademicPeriodsScreen() {
  const { profile } = useAuth()
  const [sessions, setSessions] = useState<AcademicSession[]>([])
  const [terms, setTerms] = useState<Term[]>([])
  const [currentTermId, setCurrentTermId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newSessionName, setNewSessionName] = useState('')
  const [termForm, setTermForm] = useState<Record<string, { name: string; start: string; end: string }>>({})

  const fetchData = useCallback(async () => {
    if (!profile?.organizationId) return
    try {
      setError(null)
      const result = await loadAcademicPeriods(profile.organizationId)
      setSessions(result.sessions); setTerms(result.terms); setCurrentTermId(result.currentTermId)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load academic periods.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreateSession() {
    if (!newSessionName.trim() || !profile?.organizationId) return
    try { await createSession(profile.organizationId, newSessionName); setNewSessionName(''); fetchData() }
    catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function handleCreateTerm(sessionId: string) {
    const form = termForm[sessionId]
    if (!form?.name?.trim() || !form?.end || !profile?.organizationId) {
      Alert.alert('Missing information', 'Term name and end date are required.')
      return
    }
    try {
      await createTerm(profile.organizationId, sessionId, form.name, form.start || form.end, form.end)
      setTermForm((prev) => ({ ...prev, [sessionId]: { name: '', start: '', end: '' } }))
      fetchData()
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function handleSetCurrent(termId: string) {
    if (!profile?.organizationId) return
    try { await setCurrentTerm(profile.organizationId, termId); fetchData() }
    catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function handleCloseTerm(termId: string) {
    try {
      const result = await closeTermRpc(termId)
      if (!result.closed) {
        Alert.alert(
          'Cannot close term',
          result.blockers.map((b: any) => b.message).join('\n') || 'This term has unresolved items.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Force close anyway', style: 'destructive', onPress: async () => {
              try { await closeTermRpc(termId, true); fetchData() } catch (e: any) { Alert.alert('Error', e.message) }
            }},
          ]
        )
        return
      }
      fetchData()
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  async function handleCloseSession(sessionId: string) {
    try {
      const result = await closeSessionRpc(sessionId)
      if (!result.closed) {
        Alert.alert('Cannot close session', result.blockers.map((b: any) => b.message).join('\n') || 'Some terms in this session are still open.')
        return
      }
      fetchData()
    } catch (e: any) { Alert.alert('Error', e.message) }
  }

  function handleArchiveTerm(termId: string) {
    Alert.alert('Archive term', 'This term will be archived. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => {
        try { await archiveTerm(termId, profile!.id); fetchData() } catch (e: any) { Alert.alert('Error', e.message) }
      }},
    ])
  }

  function handleArchiveSession(sessionId: string) {
    Alert.alert('Archive session', 'This will archive the session and every term under it. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Archive', style: 'destructive', onPress: async () => {
        try { await archiveSession(sessionId, profile!.id); fetchData() } catch (e: any) { Alert.alert('Error', e.message) }
      }},
    ])
  }

  if (loading) return <LoadingState label="Loading academic periods..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="Current Term">
        {terms.length === 0 ? (
          <EmptyState message="No terms yet — create a session and term below." />
        ) : (
          terms.map((t) => (
            <Pressable key={t.id} style={styles.currentTermRow} onPress={() => handleSetCurrent(t.id)}>
              <Text style={styles.currentTermText}>{t.sessionName} — {t.name}</Text>
              {t.isCurrent && <Text style={styles.currentBadge}>Current</Text>}
            </Pressable>
          ))
        )}
        <Text style={styles.warningText}>Changing this affects report generation for every teacher going forward.</Text>
      </SectionCard>

      <SectionCard title="Add a Session">
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="e.g. 2026/2027" value={newSessionName} onChangeText={setNewSessionName} />
          <Pressable style={styles.smallButton} onPress={handleCreateSession}><Text style={styles.smallButtonText}>Add</Text></Pressable>
        </View>
      </SectionCard>

      {sessions.map((session) => {
        const sessionTerms = terms.filter((t) => t.sessionId === session.id)
        const form = termForm[session.id] ?? { name: '', start: '', end: '' }
        return (
          <SectionCard key={session.id} title={session.name}>
            {sessionTerms.map((t) => (
              <View key={t.id} style={styles.termRow}>
                <Text style={styles.termName}>{t.name}{t.isCurrent ? ' (Current)' : ''}</Text>
                <View style={styles.termActions}>
                  <Pressable onPress={() => handleCloseTerm(t.id)}><Text style={styles.actionText}>Close</Text></Pressable>
                  <Pressable onPress={() => handleArchiveTerm(t.id)}><Text style={[styles.actionText, { color: '#d92d20' }]}>Archive</Text></Pressable>
                </View>
              </View>
            ))}

            <View style={styles.addTermForm}>
              <TextInput
                style={styles.input} placeholder="e.g. First Term" value={form.name}
                onChangeText={(v) => setTermForm((prev) => ({ ...prev, [session.id]: { ...form, name: v } }))}
              />
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, { flex: 1 }]} placeholder="Start (YYYY-MM-DD)" value={form.start}
                  onChangeText={(v) => setTermForm((prev) => ({ ...prev, [session.id]: { ...form, start: v } }))}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]} placeholder="End (YYYY-MM-DD)" value={form.end}
                  onChangeText={(v) => setTermForm((prev) => ({ ...prev, [session.id]: { ...form, end: v } }))}
                />
              </View>
              <Pressable style={styles.smallButton} onPress={() => handleCreateTerm(session.id)}><Text style={styles.smallButtonText}>Add Term</Text></Pressable>
            </View>

            <Pressable onPress={() => handleCloseSession(session.id)}><Text style={styles.sessionActionText}>Close Session</Text></Pressable>
            <Pressable onPress={() => handleArchiveSession(session.id)}><Text style={[styles.sessionActionText, { color: '#d92d20' }]}>Archive Session</Text></Pressable>
          </SectionCard>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  currentTermRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  currentTermText: { fontSize: 13 },
  currentBadge: { fontSize: 10, fontWeight: '700', color: '#16a34a', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  warningText: { fontSize: 11, color: '#d97706', marginTop: 8 },
  row: { flexDirection: 'row', gap: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 13, marginBottom: 8 },
  smallButton: { backgroundColor: '#1a56db', borderRadius: 6, paddingHorizontal: 14, justifyContent: 'center' },
  smallButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  termRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  termName: { fontSize: 13 },
  termActions: { flexDirection: 'row', gap: 12 },
  actionText: { fontSize: 12, color: '#1a56db', fontWeight: '500' },
  addTermForm: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee' },
  sessionActionText: { fontSize: 12, color: '#1a56db', fontWeight: '500', marginTop: 8 },
})