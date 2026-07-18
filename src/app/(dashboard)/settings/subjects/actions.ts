'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canCreateSubject, AccountRef } from '@/lib/plans/gating'
import { requireActiveSubscription } from '@/lib/subscription/checkAccess'

export async function createSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, subscription_plan').eq('id', user.id).single()

  // ✅ SUBSCRIPTION GATE: Check active subscription before creating subject
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings/subjects?error=${encodeURIComponent(message!)}`)

  const name       = (formData.get('name') as string)?.trim()
  const code       = (formData.get('code') as string)?.trim()
  const groupId    = formData.get('group_id') as string
  const templateId = formData.get('template_id') as string
  if (!name || !groupId) return

  const { data: group } = await supabase
    .from('groups')
    .select('id, instructor_id, organization_id')
    .eq('id', groupId)
    .single()

  if (!group) {
    console.error('Group not found:', groupId)
    return
  }

  if (profile?.organization_id) {
    if (group.organization_id !== profile.organization_id) {
      console.error('Group does not belong to this organization')
      return
    }
  } else {
    if (group.instructor_id !== user.id) {
      console.error('Group does not belong to this teacher')
      return
    }
  }

  // Gate: check subject limit before inserting.
  // Institutions use org-level plan, solo teachers use their own plan.
  let plan: string
  let ref: AccountRef
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations').select('subscription_plan').eq('id', profile.organization_id).single()
    plan = org?.subscription_plan ?? 'free'
    ref = { type: 'org', orgId: profile.organization_id }
  } else {
    plan = profile?.subscription_plan ?? 'free'
    ref = { type: 'solo', userId: user.id }
  }

  const gate = await canCreateSubject(plan, ref)
  if (!gate.allowed) {
    console.error('Subject limit gate blocked creation:', gate.reason)
    redirect(`/settings/subjects?error=${encodeURIComponent(gate.reason ?? 'Limit reached')}`)
  }

  const { error } = await supabase.from('subjects').insert({
    organization_id: profile?.organization_id ?? null,
    group_id:        groupId,
    name,
    code:            code || null,
    template_id:     templateId || null,
    instructor_id:   profile?.organization_id ? null : user.id,
    is_active:       true,
  })

  if (error) {
    console.error('Error creating subject:', error)
    return
  }

  revalidatePath('/settings/subjects')
  revalidatePath(`/classes/${groupId}`)
  redirect('/settings/subjects')
}

// ✅ NEW: Update subject function with subscription guard
export async function updateSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const subjectId = formData.get('id') as string
  if (!subjectId) {
    console.error('Subject ID is required')
    return
  }

  const name = (formData.get('name') as string)?.trim()
  const code = (formData.get('code') as string)?.trim()
  const groupId = formData.get('group_id') as string
  const templateId = formData.get('template_id') as string

  if (!name || !groupId) {
    console.error('Subject name and class are required')
    return
  }

  // Verify user has permission to update this subject
  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  // ✅ SUBSCRIPTION GATE: Check active subscription before updating subject
  const { allowed, message } = await requireActiveSubscription(supabase, user.id)
  if (!allowed) redirect(`/settings/subjects?error=${encodeURIComponent(message!)}`)

  // Get the existing subject
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select('organization_id, instructor_id, group_id')
    .eq('id', subjectId)
    .single()

  if (!existingSubject) {
    console.error('Subject not found:', subjectId)
    return
  }

  // Check ownership/permission
  if (profile?.organization_id) {
    // Institution: subject must belong to the same org
    if (existingSubject.organization_id !== profile.organization_id) {
      console.error('Subject does not belong to this organization')
      return
    }
  } else {
    // Solo teacher: subject must belong to them
    if (existingSubject.instructor_id !== user.id) {
      console.error('Subject does not belong to this teacher')
      return
    }
  }

  // Verify the new group belongs to the user/org
  const { data: group } = await supabase
    .from('groups')
    .select('id, instructor_id, organization_id')
    .eq('id', groupId)
    .single()

  if (!group) {
    console.error('Group not found:', groupId)
    return
  }

  if (profile?.organization_id) {
    if (group.organization_id !== profile.organization_id) {
      console.error('Group does not belong to this organization')
      return
    }
  } else {
    if (group.instructor_id !== user.id) {
      console.error('Group does not belong to this teacher')
      return
    }
  }

  // Update the subject
  const { error } = await supabase
    .from('subjects')
    .update({
      name,
      code: code || null,
      group_id: groupId,
      template_id: templateId || null,
    })
    .eq('id', subjectId)

  if (error) {
    console.error('Error updating subject:', error)
    return
  }

  revalidatePath('/settings/subjects')
  revalidatePath(`/classes/${groupId}`)
  redirect('/settings/subjects')
}

// ✅ NEW: Delete subject function (unguarded - cleanup operations are allowed)
export async function deleteSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const subjectId = formData.get('id') as string
  if (!subjectId) {
    console.error('Subject ID is required')
    return
  }

  // Verify user has permission to delete this subject
  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  // Get the existing subject
  const { data: existingSubject } = await supabase
    .from('subjects')
    .select('organization_id, instructor_id, group_id')
    .eq('id', subjectId)
    .single()

  if (!existingSubject) {
    console.error('Subject not found:', subjectId)
    return
  }

  // Check ownership/permission
  if (profile?.organization_id) {
    // Institution: subject must belong to the same org
    if (existingSubject.organization_id !== profile.organization_id) {
      console.error('Subject does not belong to this organization')
      return
    }
  } else {
    // Solo teacher: subject must belong to them
    if (existingSubject.instructor_id !== user.id) {
      console.error('Subject does not belong to this teacher')
      return
    }
  }

  // Delete the subject (soft delete - set inactive)
  const { error } = await supabase
    .from('subjects')
    .update({ is_active: false })
    .eq('id', subjectId)

  if (error) {
    console.error('Error deleting subject:', error)
    return
  }

  revalidatePath('/settings/subjects')
  redirect('/settings/subjects')
}
