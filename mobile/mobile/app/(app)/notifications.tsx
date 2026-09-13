import { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native'
import { useAuth } from '../../src/lib/auth/AuthContext'
import { loadMyNotifications, markAsRead, NotificationItem } from '../../src/lib/supabase/queries/notifications'
import { LoadingState, ErrorState, EmptyState } from '../../src/components/ui'

export default function NotificationsScreen() {
  const { profile } = useAuth()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile) return
    try {
      setError(null)
      setItems(await loadMyNotifications(profile.id))
    } catch (e: any) {
      setError(e?.message ?? 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }, [profile])

  useEffect(() => { fetchData() }, [fetchData])

  async function handlePress(item: NotificationItem) {
    if (item.isRead) return
    setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
    try { await markAsRead(item.id) } catch { /* revert not critical here */ }
  }

  if (loading) return <LoadingState label="Loading notifications..." />
  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); fetchData() }} />
  if (items.length === 0) return <EmptyState message="No notifications yet." />

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <Pressable style={styles.row} onPress={() => handlePress(item)}>
          {!item.isRead && <View style={styles.dot} />}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, !item.isRead && styles.unread]}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        </Pressable>
      )}
    />
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a56db', marginRight: 10, marginTop: 6 },
  title: { fontSize: 14, fontWeight: '500' },
  unread: { fontWeight: '700' },
  body: { fontSize: 12, color: '#666', marginTop: 2 },
  time: { fontSize: 10, color: '#aaa', marginTop: 4 },
})