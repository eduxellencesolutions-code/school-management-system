'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

export async function deleteStudent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) {
    redirect('/students?error=no_id')
  }

  try {
    // Clear dependent score records first (hard delete requires this
    // if scores.learner_id has a foreign key without ON DELETE CASCADE)
    const { error: scoresError } = await supabase
      .from('scores')
      .delete()
      .eq('learner_id', id)

    if (scoresError) {
      console.error('Error deleting scores:', scoresError)
      redirect('/students?error=delete_failed')
    }

    const { error: deleteError } = await supabase
      .from('learners')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting student:', deleteError)
      redirect('/students?error=delete_failed')
    }

    revalidatePath('/students')
    redirect('/students?success=deleted')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Unexpected error deleting student:', error)
    redirect('/students?error=unexpected')
  }
}
