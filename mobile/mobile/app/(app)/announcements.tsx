import { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Alert } from 'react-native'
import { useAuth } from '../../src/lib/auth/AuthContext'
import { canManageAnnouncements } from '../../src/lib/supabase/permissions'
import { loadAnnouncements, createAnnouncement, deleteAnnouncement, AnnouncementItem } from '../../src/lib/supabase/queries/announcements'
import { LoadingState, ErrorState, EmptyState } from '../../src/components/ui'

const AUDIENCE_OPTIONS: { value: 'all' | 'staff' | 'parents'; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'staff', label: 'Staff only' },
  { value: 'parents', label: 'Parents only' },
]

export default function AnnouncementsScreen() {
  const { profile } = useAuth()
  const [items, setItems] = useState<AnnouncementItem[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'staff' | 'parents'>('all')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile?.organizationId) return
    try {
      setError(null)
      const [list, manage] = await Promise.all([
        loadAnnouncements(profile.organizationId),
        canManageAnnouncements(profile.id, profile.role),
      ])
      setItems(list)
      setCanManage(manage)
    } catch (e: any) {
      setError(e?.message ?? 'Could not load announcements.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  async function handlePost() {
    if (!title.trim() || !body.trim() || !profile?.organizationId) {
      Alert.alert('Missing information', 'Please enter both a title and a message.')
      return
    }
    setSubmitting(true)
    try {
      await createAnnouncement({
        organizationId: profile.organizationId, title: title.trim(), body: body.trim(),
        audience, createdBy: profile.id,
      })
      setTitle(''); setBody(''); setAudience('all'); setShowForm(false)
      fetchData()
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not post announcement.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete(id: string) {
    Alert.alert('Delete announcement', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteAnnouncement(id); fetchData() }
        catch (e: any) { Alert.alert('Error', e?.message ?? 'Could not delete.') }
      }},
    ])
  }

  if (loading) return <LoadingState label="Loading announcements..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Announcements</Text>
        {canManage && (
          <Pressable onPress={() => setShowForm((v) => !v)}>
            <Text style={styles.newButton}>{showForm ? 'Cancel' : '+ New'}</Text>
          </Pressable>
        )}
      </View>

      {showForm && (
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message"
            value={body}
            onChangeText={setBody}
            multiline
          />
          <View style={styles.audienceRow}>
            {AUDIENCE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[styles.audienceChip, audience === opt.value && styles.audienceChipActive]}
                onPress={() => setAudience(opt.value)}
              >
                <Text style={[styles.audienceChipText, audience === opt.value && styles.audienceChipTextActive]}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable style={[styles.postButton, submitting && { opacity: 0.6 }]} onPress={handlePost} disabled={submitting}>
            <Text style={styles.postButtonText}>{submitting ? 'Posting...' : 'Post Announcement'}</Text>
          </Pressable>
        </View>
      )}

      {items.length === 0 ? (
        <EmptyState message="No announcements yet." />
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.isPlatformWide && <Text style={styles.platformTag}>Platform</Text>}
            </View>
            <Text style={styles.cardBody}>{item.body}</Text>
            <View style={styles.cardFooter}>
              <Text style={styles.cardMeta}>
                {new Date(item.createdAt).toLocaleDateString()} · {item.audience}
              </Text>
              {canManage && !item.isPlatformWide && (
                <Pressable onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  newButton: { color: '#1a56db', fontWeight: '600' },
  form: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 14 },
  textArea: { height: 80, textAlignVertical: 'top' },
  audienceRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  audienceChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#eee' },
  audienceChipActive: { backgroundColor: '#1a56db' },
  audienceChipText: { fontSize: 11, color: '#666' },
  audienceChipTextActive: { color: '#fff', fontWeight: '600' },
  postButton: { backgroundColor: '#1a56db', borderRadius: 8, padding: 12, alignItems: 'center' },
  postButtonText: { color: '#fff', fontWeight: '600' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  platformTag: { fontSize: 10, color: '#999', backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  cardBody: { fontSize: 13, color: '#444', marginTop: 6, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cardMeta: { fontSize: 11, color: '#999' },
  deleteText: { fontSize: 12, color: '#d92d20', fontWeight: '500' },
})