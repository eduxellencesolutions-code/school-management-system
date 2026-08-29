'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'
import { checkPlanLimit } from '@/lib/subscription/checkPlanLimit'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function deleteGroup(formData: FormData) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  // ✅ Subscription gate — expired accounts cannot delete classes
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)

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
    // ✅ If it's a redirect error, re-throw it (this is the fix!)
    if (isRedirectError(error)) {
      throw error
    }
    console.error('Unexpected error deleting group:', error)
    redirect('/classes?error=unexpected')
  }
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  console.log('🔍 [createGroup] Starting class creation for user:', user.id)

  // Check subscription status gate
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  console.log('🔍 [createGroup] Subscription check:', { userId: user.id, allowed, message })
  if (!allowed) {
    console.log('❌ [createGroup] Subscription gate blocked:', message)
    redirect(`/settings?tab=billing&error=${encodeURIComponent(message!)}`)
  }

  // Check plan limit gate (maxClasses)
  const limitCheck = await checkPlanLimit(supabase, user.id, 'maxClasses')
  console.log('🔍 [createGroup] Plan limit check:', { 
    userId: user.id, 
    allowed: limitCheck.allowed, 
    message: limitCheck.message 
  })
  if (!limitCheck.allowed) {
    console.log('❌ [createGroup] Plan limit gate blocked:', limitCheck.message)
    redirect(`/classes/new?error=${encodeURIComponent(limitCheck.message!)}`)
  }

  console.log('✅ [createGroup] All checks passed, proceeding to create class')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  if (profile?.organization_id && !isAdmin) {
    console.log('❌ [createGroup] Not authorized - user is not admin')
    redirect('/classes?error=not_authorized')
  }

  const name = (formData.get('name') as string)?.trim()
  const code = (formData.get('code') as string)?.trim() || null
  const type = formData.get('type') as string
  const sessionId = (formData.get('session_id') as string) || null
  const termId = (formData.get('term_id') as string) || null
  const section = (formData.get('section') as string) || null
  const arm = (formData.get('arm') as string)?.trim() || null

  if (!name) {
    console.log('❌ [createGroup] Missing class name')
    redirect('/classes/new?error=missing_name')
  }

  console.log('📝 [createGroup] Inserting class:', { name, code, type, sessionId, termId, section, arm, organization_id: profile?.organization_id ?? null })

  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      organization_id: profile?.organization_id ?? null,
      name,
      code,
      type,
      instructor_id: user.id,
      session_id: sessionId,
      term_id: termId,
      section,
      arm,
      is_active: true,
    })
    .select()
    .single()

  if (error) {
    console.error('❌ [createGroup] Error creating class:', error)
    redirect(`/classes/new?error=${encodeURIComponent('Failed to create class')}`)
  }

  console.log('✅ [createGroup] Class created successfully:', group.id)
  revalidatePath('/classes')
  redirect(`/classes/${group.id}`)
}