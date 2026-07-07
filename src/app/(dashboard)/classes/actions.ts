'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function deleteGroup(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = formData.get('id') as string
  if (!id) {
    console.error('No group ID provided')
    redirect('/classes?error=no_id')
  }

  console.log('🗑️ Attempting to delete group:', id)

  try {
    // ✅ Check if students are enrolled
    const { count, error: countError } = await supabase
      .from('learners')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', id)
      .eq('is_active', true)

    if (countError) {
      console.error('Error checking students:', countError)
      redirect('/classes?error=check_failed')
    }

    if (count && count > 0) {
      console.log(`⚠️ Group has ${count} students - cannot delete`)
      redirect('/classes?error=has_students')
    }

    // ✅ Check if subjects exist
    const { count: subjectCount, error: subjectError } = await supabase
      .from('subjects')
      .select('id', { count: 'exact', head: true })
      .eq('group_id', id)
      .eq('is_active', true)

    if (subjectError) {
      console.error('Error checking subjects:', subjectError)
    }

    // ✅ Soft-delete subjects first
    if (subjectCount && subjectCount > 0) {
      console.log(`📚 Soft-deleting ${subjectCount} subjects`)
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ is_active: false })
        .eq('group_id', id)

      if (updateError) {
        console.error('Error soft-deleting subjects:', updateError)
        // Continue anyway - we still want to delete the group
      }
    }

    // ✅ Delete any teacher assignments for this group
    const { error: assignmentError } = await supabase
      .from('teacher_assignments')
      .delete()
      .eq('class_id', id)

    if (assignmentError) {
      console.error('Error deleting teacher assignments:', assignmentError)
      // Continue anyway - we still want to delete the group
    }

    // ✅ Finally, delete the group
    const { error: deleteError } = await supabase
      .from('groups')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting group:', deleteError)
      redirect('/classes?error=delete_failed')
    }

    console.log(`✅ Group ${id} deleted successfully`)

    // ✅ Revalidate and redirect
    revalidatePath('/classes')
    revalidatePath('/dashboard')
    redirect('/classes?success=deleted')

  } catch (error) {
    console.error('Unexpected error deleting group:', error)
    redirect('/classes?error=unexpected')
  }
}
