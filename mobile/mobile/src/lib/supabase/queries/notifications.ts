import { supabase } from '../client'

export interface NotificationItem {
  id: string; title: string; body: string; createdAt: string; isRead: boolean
}

export async function loadMyNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, created_at, is_read')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error('Could not load notifications.')
  return (data ?? []).map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.created_at, isRead: n.is_read }))
}

export async function markAsRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id)
  if (error) throw new Error('Could not mark notification as read.')
}