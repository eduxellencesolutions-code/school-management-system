import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../src/lib/auth/AuthContext'
import { loadStudents, loadClassOptionsForFilter, StudentListItem } from '../../../src/lib/supabase/queries/students'
import { LoadingState, ErrorState, EmptyState } from '../../../src/components/ui'

export default function StudentsScreen() {
  const { profile } = useAuth()
  const [students, setStudents] = useState<StudentListItem[]>([])
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined)
  const [tier, setTier] = useState<'full' | 'assigned'>('assigned')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile || profile.kind !== 'staff') return
    if (!profile.organizationId) return
    try {
      setError(null)
      const [studentsResult, classOptions] = await Promise.all([
        loadStudents(profile.id, profile.role, profile.organizationId, selectedClass),
        loadClassOptionsForFilter(profile.id, profile.role, profile.organizationId),
      ])
      setStudents(studentsResult.students)
      setTier(studentsResult.tier)
      setClasses(classOptions)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load students.')
    } finally {
      setLoading(false)
    }
  }, [profile, selectedClass])

  useEffect(() => { fetchData() }, [fetchData])

  // Parents/students never reach this screen — this guard satisfies the type
  // system (ParentProfile/StudentProfile have no organizationId/role).
  if (!profile || profile.kind !== 'staff') {
    return <ErrorState message="This screen is not available for your account type." onRetry={() => {}} />
  }

  if (loading) return <LoadingState label="Loading students..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Students</Text>
        <Text style={styles.subtitle}>{students.length} student{students.length !== 1 ? 's' : ''} found</Text>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, !selectedClass && styles.filterChipActive]}
          onPress={() => setSelectedClass(undefined)}
        >
          <Text style={[styles.filterChipText, !selectedClass && styles.filterChipTextActive]}>All</Text>
        </Pressable>
        {classes.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.filterChip, selectedClass === c.id && styles.filterChipActive]}
            onPress={() => setSelectedClass(c.id)}
          >
            <Text style={[styles.filterChipText, selectedClass === c.id && styles.filterChipTextActive]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      {students.length === 0 ? (
        <EmptyState message={tier === 'assigned' ? "You don't have any students assigned to you yet." : 'No students found.'} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => router.push({ pathname: '/(app)/admin/students/[id]', params: { id: item.id } })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.firstName[0]}{item.lastName[0]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.lastName} {item.firstName}</Text>
                <Text style={styles.meta}>
                  {item.admissionNumber ?? 'No adm. no.'} · {item.className ?? 'No class'}
                </Text>
              </View>
              {item.gender && <Text style={styles.gender}>{item.gender === 'M' ? 'Male' : item.gender === 'F' ? 'Female' : 'Other'}</Text>}
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f0f0f0' },
  filterChipActive: { backgroundColor: '#1a56db' },
  filterChipText: { fontSize: 12, color: '#666' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#666' },
  name: { fontSize: 14, fontWeight: '500' },
  meta: { fontSize: 11, color: '#999', marginTop: 2 },
  gender: { fontSize: 11, color: '#999' },
})