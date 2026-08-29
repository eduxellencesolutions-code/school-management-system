'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function updateMySignature(signatureUrl: string) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('users')
    .update({ signature_url: signatureUrl })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating signature:', error)
    throw new Error('Failed to save signature')
  }

  revalidatePath('/settings/profile')
  revalidatePath('/reports')
  
  return { success: true }
}