'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteGroup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) return

  // Safety check: don't delete if students are enrolled
  const { count } = await supabase
    .from('learners')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', id)

  if (count && count > 0) {
    redirect('/classes?error=has_students')
  }

  // Soft-delete subjects first to preserve score history
  await supabase.from('subjects').update({ is_active: false }).eq('group_id', id)

  // Delete the group
  await supabase.from('groups').delete().eq('id', id)

  revalidatePath('/classes')
  redirect('/classes')
}
