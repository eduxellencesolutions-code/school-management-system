import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../../../src/lib/auth/AuthContext'
import { supabase } from '../../../../src/lib/supabase/client'
import { loadGenerateReportInfo, generateReport, GenerateReportClassInfo } from '../../../../src/lib/supabase/queries/reports'
import { LoadingState, ErrorState, EmptyState } from '../../../../src/components/ui'

export default function GenerateReportScreen() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [info, setInfo] = useState<GenerateReportClassInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.kind !== 'staff' || !profile.organizationId) return
    const isAdmin = profile.role === 'admin' || profile.role === 'school_admin'
    async function load() {
      let query = supabase.from('groups').select('id, name').eq('organization_id', profile.organizationId!).eq('is_active', true).order('name')
      if (!isAdmin) {
        const { data: assignments } = await supabase.from('teacher_assignments').select('class_id').eq('teacher_id', profile.id).eq('role', 'class_teacher')
        const ids = [...new Set((assignments ?? []).map((a) => a.class_id).filter(Boolean))]
        query = ids.length ? supabase.from('groups').select('id, name').in('id', ids).eq('is_active', true).order('name') : query.eq('id', '00000000-0000-0000-0000-000000000000')
      }
      const { data, error } = await query
      if (error) setError('Could not load classes.')
      else { setClasses(data ?? []); if (data?.[0]) setSelectedGroupId(data[0].id) }
      setLoading(false)
    }
    load()
  }, [profile])

  useEffect(() => {
    if (!selectedGroupId) return
    setLoadingInfo(true)
    loadGenerateReportInfo(selectedGroupId).then(setInfo).catch((e) => setError(e.message)).finally(() => setLoadingInfo(false))
  }, [selectedGroupId])

  async function handleGenerate() {
    if (!profile?.organizationId || !selectedGroupId) return
    const missingTemplates = info?.subjects.filter((s) => !s.hasTemplate) ?? []
    if (missingTemplates.length > 0) {
      Alert.alert('Cannot generate', `Assign a template to: ${missingTemplates.map((s) => s.name).join(', ')}`)
      return
    }
    setGenerating(true)
    try {
      const result = await generateReport({ orgId: profile.organizationId, groupId: selectedGroupId, userId: profile.id })
      router.replace({ pathname: '/(app)/admin/reports/[id]', params: { id: result.reportId } })
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to generate report.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <LoadingState label="Loading classes..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null) }} />
  if (classes.length === 0) return <EmptyState message="No classes available to generate reports for." />

  const missingTemplates = info?.subjects.filter((s) => !s.hasTemplate) ?? []
  const canGenerate = info && info.hasScores && info.subjects.length > 0 && missingTemplates.length === 0

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.label}>Select a class</Text>
      {classes.map((c) => (
        <Pressable key={c.id} style={[styles.classRow, selectedGroupId === c.id && styles.classRowActive]} onPress={() => setSelectedGroupId(c.id)}>
          <Text style={styles.classRowText}>{c.name}</Text>
        </Pressable>
      ))}

      {loadingInfo ? (
        <LoadingState label="Checking scores..." />
      ) : info ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoLine}>{info.learnerCount} students · {info.subjectCount} subjects · {info.subjects.filter((s) => s.isComplete).length} complete</Text>
          {info.subjects.map((s) => (
            <View key={s.id} style={styles.subjectRow}>
              <Text style={styles.subjectName}>{s.name}</Text>
              <Text style={[styles.subjectStatus, { color: !s.hasTemplate ? '#d92d20' : s.isComplete ? '#16a34a' : s.scoreCount > 0 ? '#d97706' : '#999' }]}>
                {!s.hasTemplate ? 'No template' : s.isComplete ? 'Complete' : s.scoreCount > 0 ? 'Partial' : 'No scores'}
              </Text>
            </View>
          ))}
          {missingTemplates.length > 0 && (
            <Text style={styles.warningText}>Assign a template to: {missingTemplates.map((s) => s.name).join(', ')} first.</Text>
          )}
          {!info.hasScores && <Text style={styles.warningText}>No scores have been entered for this class yet.</Text>}
        </View>
      ) : null}

      <Pressable style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]} onPress={handleGenerate} disabled={!canGenerate || generating}>
        <Text style={styles.generateButtonText}>{generating ? 'Generating...' : 'Generate Now'}</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8 },
  classRow: { padding: 12, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, marginBottom: 8 },
  classRowActive: { borderColor: '#1a56db', backgroundColor: '#eef2ff' },
  classRowText: { fontSize: 14 },
  infoBox: { marginTop: 16, marginBottom: 16 },
  infoLine: { fontSize: 12, color: '#666', marginBottom: 10 },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  subjectName: { fontSize: 13 },
  subjectStatus: { fontSize: 11, fontWeight: '600' },
  warningText: { fontSize: 12, color: '#d92d20', marginTop: 10 },
  generateButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 14, alignItems: 'center' },
  generateButtonDisabled: { opacity: 0.5 },
  generateButtonText: { color: '#fff', fontWeight: '600' },
})