'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteGroup(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()

  // Safety check: don't delete if students are enrolled
  const { count } = await supabase
    .from('learners')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', id)

  if (count && count > 0) {
    // Can't delete — has students. You'd surface this as an error.
    // For now redirect back; we'll wire up error display next.
    redirect('/classes?error=has_students')
  }

  await supabase.from('groups').delete().eq('id', id)
  revalidatePath('/classes')
  redirect('/classes')
}
