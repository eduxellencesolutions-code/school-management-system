import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { loadGroupsForScoreEntry, loadSubjectsForScoreEntry, ScoreEntryGroup, ScoreEntrySubject } from '../../../../src/lib/supabase/queries/scoreEntry'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'

export default function ScoreEntrySelector() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<ScoreEntryGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<ScoreEntryGroup | null>(null)
  const [subjects, setSubjects] = useState<ScoreEntrySubject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profile || profile.kind !== 'staff') return
    if (!profile.organizationId) return
    loadGroupsForScoreEntry(profile.id, profile.organizationId, profile.role)
      .then((r) => setGroups(r.groups))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [profile])

  async function selectGroup(group: ScoreEntryGroup) {
    if (!profile || profile.kind !== 'staff') return
    setSelectedGroup(group)
    setLoadingSubjects(true)
    try {
      const { subjects } = await loadSubjectsForScoreEntry(profile.id, profile.role, group.id)
      setSubjects(subjects)
      if (subjects.length === 0) setError('No subjects available to you in this class.')
      else setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoadingSubjects(false)
    }
  }

  // Parents never reach this screen (routing prevents it) — this guard just
  // satisfies the type system, since ParentProfile has no `organizationId`.
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading your classes..." />
  if (error && !selectedGroup) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Select a class</Text>
      {groups.length === 0 ? (
        <EmptyState message="You have no classes available for score entry." />
      ) : (
        groups.map((g) => (
          <Pressable
            key={g.id}
            style={[styles.item, selectedGroup?.id === g.id && styles.itemSelected]}
            onPress={() => selectGroup(g)}
          >
            <Text style={styles.itemText}>{g.name}</Text>
          </Pressable>
        ))
      )}

      {selectedGroup && (
        <>
          <Text style={[styles.label, { marginTop: 24 }]}>Select a subject</Text>
          {loadingSubjects ? (
            <LoadingState label="Loading subjects..." />
          ) : error ? (
            <EmptyState message={error} />
          ) : (
            subjects.map((s) => (
              <Pressable
                key={s.id}
                style={styles.item}
                onPress={() => router.push({
                  pathname: '/(app)/teacher/scores/grid',
                  params: { groupId: selectedGroup.id, subjectId: s.id },
                })}
              >
                <Text style={styles.itemText}>{s.name}</Text>
              </Pressable>
            ))
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#666' },
  item: {
    padding: 14, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 8,
  },
  itemSelected: { borderColor: '#1a56db', backgroundColor: '#eef2ff' },
  itemText: { fontSize: 14, fontWeight: '500' },
})