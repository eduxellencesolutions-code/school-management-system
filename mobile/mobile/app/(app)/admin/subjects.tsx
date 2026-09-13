import { useCallback, useEffect, useState } from 'react'
import { View, Text, SectionList, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Pressable } from 'react-native'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadSubjects, SubjectListItem } from '../../../src/lib/supabase/queries/subjects'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function SubjectsScreen() {
  const { profile } = useAuth()
  const [sections, setSections] = useState<{ title: string; data: SubjectListItem[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile?.organizationId) return
    try {
      setError(null)
      const { subjectsByClass } = await loadSubjects(profile.id, profile.role, profile.organizationId)
      setSections(Object.entries(subjectsByClass).map(([, subs]) => ({ title: subs[0]?.className ?? 'Ungrouped', data: subs })))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load subjects.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <LoadingState label="Loading subjects..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (sections.length === 0) return <EmptyState message="No subjects found." />

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      renderItem={({ item }) => (
        <Pressable
          style={styles.row}
          onPress={() => item.groupId && router.push({ pathname: '/(app)/teacher/scores/grid', params: { groupId: item.groupId, subjectId: item.id } })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}{item.code ? ` (${item.code})` : ''}</Text>
            <Text style={styles.template}>{item.templateName ?? 'No assessment template assigned'}</Text>
          </View>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#666', backgroundColor: '#f9fafb', padding: 8, marginTop: 8 },
  row: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  name: { fontSize: 14, fontWeight: '500' },
  template: { fontSize: 11, color: '#999', marginTop: 2 },
})