'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { canCreateAcademicSession, AccountRef } from '@/lib/plans/gating'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id, role').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'
  if (profile?.organization_id && !isAdmin) redirect('/settings/academic')

  return { user, orgId: profile?.organization_id ?? null }
}

// Fetches the current subscription_plan for whoever is acting —
// org-level plan for institutions, user-level plan for solo teachers.
async function getActingPlan(userId: string, orgId: string | null): Promise<{ plan: string; ref: AccountRef }> {
  const supabase = await createClient()
  if (orgId) {
    const { data } = await supabase.from('organizations').select('subscription_plan').eq('id', orgId).single()
    return { plan: data?.subscription_plan ?? 'free', ref: { type: 'org', orgId } }
  }
  const { data } = await supabase.from('users').select('subscription_plan').eq('id', userId).single()
  return { plan: data?.subscription_plan ?? 'free', ref: { type: 'solo', userId } }
}

export async function createSession(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const name = (formData.get('name') as string)?.trim()
    if (!name) return { success: false, error: 'Session name is required' }

    // ✅ GATE: Check if user can create a new academic session
    const { plan, ref } = await getActingPlan(user.id, orgId)
    const gate = await canCreateAcademicSession(plan, ref)
    if (!gate.allowed) return { success: false, error: gate.reason }

    const { error } = await supabase.from('academic_sessions').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      name,
      is_active: true,
    })

    if (error) {
      console.error('Error creating session:', error)
      return { success: false, error: error.message }
    }

    console.log('Session created successfully')
    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error: any) {
    console.error('Create session error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

// ✅ Terms are NOT capped by plan limits - no gate needed
export async function createTerm(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const sessionId = formData.get('session_id') as string
    const name = (formData.get('name') as string)?.trim()
    
    if (!sessionId) return { success: false, error: 'Session ID is required' }
    if (!name) return { success: false, error: 'Term name is required' }

    console.log('Creating term for:', { userId: user.id, orgId, sessionId })

    const { error } = await supabase.from('terms').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      session_id: sessionId,
      name,
      is_active: true,
    })

    if (error) {
      console.error('Error creating term:', error)
      return { success: false, error: error.message }
    }

    console.log('Term created successfully')
    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error: any) {
    console.error('Create term error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

export async function deleteSession(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) return { success: false, error: 'Session ID is required' }

    // Delete all terms in this session first
    await supabase.from('terms').delete().eq('session_id', id)
    const { error } = await supabase.from('academic_sessions').delete().eq('id', id)
    
    if (error) {
      console.error('Error deleting session:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error: any) {
    console.error('Delete session error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

export async function deleteTerm(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) return { success: false, error: 'Term ID is required' }

    const { error } = await supabase.from('terms').delete().eq('id', id)
    if (error) {
      console.error('Error deleting term:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error: any) {
    console.error('Delete term error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}

export async function setCurrentTerm(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()
    const termId = formData.get('term_id') as string

    console.log('Setting current term:', { userId: user.id, orgId, termId })

    if (orgId) {
      const { error } = await supabase
        .from('organizations')
        .update({ current_term_id: termId || null })
        .eq('id', orgId)
      
      if (error) {
        console.error('Error updating organization term:', error)
        return { success: false, error: error.message }
      }
    } else {
      const { error } = await supabase
        .from('users')
        .update({ current_term_id: termId || null })
        .eq('id', user.id)
      
      if (error) {
        console.error('Error updating user term:', error)
        return { success: false, error: error.message }
      }
    }

    revalidatePath('/settings/academic')
    revalidatePath('/reports/generate')
    return { success: true }
  } catch (error: any) {
    console.error('Set current term error:', error)
    return { success: false, error: error.message ?? 'Something went wrong' }
  }
}
