import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadTeachers, removeTeacher, TeacherListItem } from '../../../src/lib/supabase/queries/teachers'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function TeachersScreen() {
  const { profile } = useAuth()
  const [teachers, setTeachers] = useState<TeacherListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile || profile.kind !== 'staff' || !profile.organizationId) return
    try {
      setError(null)
      setTeachers(await loadTeachers(profile.organizationId))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load teachers.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  function handleRemove(teacher: TeacherListItem) {
    Alert.alert('Remove teacher', `Remove ${teacher.name}? This deletes their account and all assignments.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await removeTeacher(teacher.id); fetchData() }
        catch (e: any) { Alert.alert('Error', e.message) }
      }},
    ])
  }

  // Parents/students never reach this screen — this guard satisfies the type
  // system (ParentProfile/StudentProfile have no organizationId).
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading teachers..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />

  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>Teachers</Text>
      <Pressable style={styles.addButton} onPress={() => router.push('/(app)/admin/teachers/new')}>
        <Text style={styles.addButtonText}>+ Add Teacher</Text>
      </Pressable>
    </View>
  )

  if (teachers.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {Header}
        <EmptyState message="No teachers added yet." />
      </View>
    )
  }

  return (
    <FlatList
      data={teachers}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={Header}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <Text style={styles.roleTag}>{item.role}</Text>
          </View>

          {item.classAssignments.length > 0 && (
            <View style={styles.assignBlock}>
              <Text style={styles.assignLabel}>Class Teacher</Text>
              {item.classAssignments.map((a, i) => <Text key={i} style={styles.assignText}>{a.className}</Text>)}
            </View>
          )}
          {item.subjectAssignments.length > 0 && (
            <View style={styles.assignBlock}>
              <Text style={styles.assignLabel}>Subjects</Text>
              {item.subjectAssignments.map((a, i) => <Text key={i} style={styles.assignText}>{a.subjectName} · {a.className ?? '—'}</Text>)}
            </View>
          )}
          {item.classAssignments.length === 0 && item.subjectAssignments.length === 0 && (
            <Text style={styles.noAssign}>No assignments yet</Text>
          )}

          <Pressable onPress={() => handleRemove(item)}><Text style={styles.removeText}>Remove Teacher</Text></Pressable>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  addButton: { backgroundColor: '#1a56db', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 15, fontWeight: '600' },
  email: { fontSize: 12, color: '#999', marginTop: 2 },
  roleTag: { fontSize: 10, fontWeight: '600', color: '#1a56db', backgroundColor: '#eef2ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, textTransform: 'capitalize' },
  assignBlock: { marginBottom: 6 },
  assignLabel: { fontSize: 10, fontWeight: '700', color: '#999', marginBottom: 2 },
  assignText: { fontSize: 12, color: '#444' },
  noAssign: { fontSize: 12, color: '#999', fontStyle: 'italic', marginBottom: 8 },
  removeText: { fontSize: 12, color: '#d92d20', fontWeight: '500', marginTop: 6 },
})