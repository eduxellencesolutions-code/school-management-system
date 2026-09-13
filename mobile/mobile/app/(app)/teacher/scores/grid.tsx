import { useEffect, useState, useRef, useCallback } from 'react'
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { loadScoreGridData, saveScore, ScoreLearner, ScoreComponent, ExistingScore } from '../../../../src/lib/supabase/queries/scoreEntry'
import { checkActiveSubscription } from '../../../../src/lib/supabase/queries/subscription'
import { LoadingState, ErrorState } from '../../../../src/components/ui'

type CellStatus = 'idle' | 'saving' | 'saved' | 'error'
type ScoreMap = Record<string, Record<string, { value: number | null; status: CellStatus }>>

export default function ScoreGrid() {
  const { profile } = useAuth()
  const { groupId, subjectId } = useLocalSearchParams<{ groupId: string; subjectId: string }>()
  const [learners, setLearners] = useState<ScoreLearner[]>([])
  const [components, setComponents] = useState<ScoreComponent[]>([])
  const [subjectName, setSubjectName] = useState('')
  const [scores, setScores] = useState<ScoreMap>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subscriptionActive, setSubscriptionActive] = useState(true)
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null)
  const timeoutRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    if (!groupId || !subjectId) return
    if (!profile || profile.kind !== 'staff') return

    loadScoreGridData(groupId, subjectId)
      .then((result) => {
        setLearners(result.learners)
        setComponents(result.components)
        setSubjectName(result.subjectName)
        const map: ScoreMap = {}
        for (const l of result.learners) {
          map[l.id] = {}
          for (const c of result.components) {
            const existing = result.existingScores.find((s) => s.learnerId === l.id && s.componentId === c.id)
            map[l.id][c.id] = { value: existing?.score ?? null, status: 'idle' }
          }
        }
        setScores(map)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    checkActiveSubscription(profile.id).then((r) => {
      setSubscriptionActive(r.allowed)
      setSubscriptionMessage(r.message ?? null)
    })

    return () => {
      Object.values(timeoutRefs.current).forEach(clearTimeout)
      timeoutRefs.current = {}
    }
  }, [groupId, subjectId, profile])

  const persistScore = useCallback(async (learnerId: string, componentId: string, value: number | null) => {
    if (!profile || profile.kind !== 'staff') return
    const component = components.find((c) => c.id === componentId)
    if (component && value !== null && value > component.maxScore) {
      setScores((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'error' } } }))
      return
    }
    setScores((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'saving' } } }))
    try {
      await saveScore({ learnerId, subjectId: subjectId!, componentId, score: value, enteredBy: profile.id })
      setScores((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'saved' } } }))
    } catch {
      setScores((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'error' } } }))
    }
  }, [components, subjectId, profile])

  function handleChange(learnerId: string, componentId: string, raw: string) {
    const value = raw === '' ? null : parseFloat(raw)
    setScores((prev) => ({ ...prev, [learnerId]: { ...prev[learnerId], [componentId]: { value, status: 'idle' } } }))
    const key = `${learnerId}-${componentId}`
    if (timeoutRefs.current[key]) clearTimeout(timeoutRefs.current[key])
    timeoutRefs.current[key] = setTimeout(() => {
      persistScore(learnerId, componentId, value)
      delete timeoutRefs.current[key]
    }, 600)
  }

  function rowTotal(learnerId: string) {
    return Object.values(scores[learnerId] ?? {}).reduce((sum, c) => sum + (c.value ?? 0), 0)
  }

  // Parents never reach this screen (routing prevents it) — this guard just
  // satisfies the type system, since ParentProfile has no `organizationId`
  // and its `id` is not a users.id.
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading scores..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (learners.length === 0) return <ErrorState message="No students enrolled in this class yet." onRetry={() => {}} />
  if (components.length === 0) return <ErrorState message="This subject has no assessment template configured. Set one up on the web app first." onRetry={() => {}} />

  const sortedComponents = [...components].sort((a, b) => a.sequence - b.sequence)

  if (!subscriptionActive) {
    return (
      <View style={styles.container}>
        <View style={styles.header}><Text style={styles.title}>{subjectName}</Text></View>
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fffbeb', borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' }}>
          <Text style={{ color: '#92400e', fontWeight: '600', fontSize: 13 }}>Subscription expired — read-only</Text>
          <Text style={{ color: '#92400e', fontSize: 12, marginTop: 4 }}>{subscriptionMessage}</Text>
        </View>
        <ScrollView horizontal>
          <View>
            <View style={styles.row}>
              <Text style={[styles.headerCell, styles.nameCell]}>Student</Text>
              {sortedComponents.map((c) => (
                <Text key={c.id} style={[styles.headerCell, styles.scoreCell]}>{c.name}</Text>
              ))}
            </View>
            {learners.map((l) => (
              <View key={l.id} style={styles.row}>
                <Text style={[styles.cellText, styles.nameCell]}>{l.lastName} {l.firstName}</Text>
                {sortedComponents.map((c) => {
                  const val = scores[l.id]?.[c.id]?.value
                  return <Text key={c.id} style={[styles.cellText, styles.scoreCell, { textAlign: 'center' }]}>{val ?? '—'}</Text>
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{subjectName}</Text>
      </View>
      <ScrollView horizontal>
        <View>
          <View style={styles.row}>
            <Text style={[styles.headerCell, styles.nameCell]}>Student</Text>
            {sortedComponents.map((c) => (
              <Text key={c.id} style={[styles.headerCell, styles.scoreCell]}>{c.name}{'\n'}/{c.maxScore}</Text>
            ))}
            <Text style={[styles.headerCell, styles.scoreCell]}>Total</Text>
          </View>
          <ScrollView>
            {learners.map((l) => (
              <View key={l.id} style={styles.row}>
                <Text style={[styles.cellText, styles.nameCell]}>{l.lastName} {l.firstName}</Text>
                {sortedComponents.map((c) => {
                  const cell = scores[l.id]?.[c.id]
                  return (
                    <TextInput
                      key={c.id}
                      style={[
                        styles.input,
                        cell?.status === 'saved' && styles.inputSaved,
                        cell?.status === 'error' && styles.inputError,
                      ]}
                      keyboardType="numeric"
                      value={cell?.value != null ? String(cell.value) : ''}
                      onChangeText={(text) => handleChange(l.id, c.id, text)}
                      placeholder="-"
                    />
                  )
                })}
                <Text style={[styles.cellText, styles.scoreCell, styles.totalText]}>{rowTotal(l.id) || '-'}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
      <Text style={styles.hint}>Scores save automatically as you type.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#666', padding: 8, textAlign: 'center' },
  nameCell: { width: 140, textAlign: 'left' },
  scoreCell: { width: 70 },
  cellText: { fontSize: 13, padding: 8 },
  totalText: { fontWeight: '700', textAlign: 'center' },
  input: {
    width: 70, height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 6,
    margin: 4, textAlign: 'center', fontSize: 13,
  },
  inputSaved: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  inputError: { borderColor: '#d92d20', backgroundColor: '#fef2f2' },
  hint: { textAlign: 'center', fontSize: 11, color: '#999', padding: 12 },
})