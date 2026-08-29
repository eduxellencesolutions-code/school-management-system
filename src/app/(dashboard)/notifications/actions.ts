'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function markAllNotificationsAsRead() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('Error marking all as read:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/notifications')
  return { success: true }
}
