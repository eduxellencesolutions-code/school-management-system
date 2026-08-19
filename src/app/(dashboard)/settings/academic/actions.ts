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

export async function createSession(formData: FormData): Promise<void> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const name = (formData.get('name') as string)?.trim()
    if (!name) {
      console.error('Session name is required')
      return
    }

    const { plan, ref } = await getActingPlan(user.id, orgId)
    const gate = await canCreateAcademicSession(plan, ref)
    if (!gate.allowed) {
      console.error('Session limit gate blocked creation:', gate.reason)
      return
    }

    const { error } = await supabase.from('academic_sessions').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      name,
      is_active: true,
    })

    if (error) {
      console.error('Error creating session:', error)
      return
    }

    console.log('Session created successfully')
    revalidatePath('/settings/academic')
  } catch (error: any) {
    console.error('Create session error:', error)
  }
}

export async function createTerm(formData: FormData): Promise<void> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const sessionId = formData.get('session_id') as string
    const name = (formData.get('name') as string)?.trim()
    const startDate = (formData.get('start_date') as string) || null
    const endDate = (formData.get('end_date') as string) || null

    if (!sessionId) {
      console.error('Session ID is required')
      return
    }
    if (!name) {
      console.error('Term name is required')
      return
    }
    if (!endDate) {
      console.error('Term end date is required')
      return
    }

    const { error } = await supabase.from('terms').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      session_id: sessionId,
      name,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    })

    if (error) {
      console.error('Error creating term:', error)
      return
    }

    console.log('Term created successfully')
    revalidatePath('/settings/academic')
  } catch (error: any) {
    console.error('Create term error:', error)
  }
}

export async function deleteSession(formData: FormData): Promise<void> {
  try {
    const { user } = await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      console.error('Session ID is required')
      return
    }

    // Soft-archive every term under this session, then the session itself.
    // Nothing is deleted — this replaces the previous hard-delete cascade,
    // which destroyed every term (and everything under it) permanently.
    await supabase
      .from('terms')
      .update({ status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: user.id })
      .eq('session_id', id)

    const { error } = await supabase
      .from('academic_sessions')
      .update({ status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: user.id })
      .eq('id', id)

    if (error) {
      console.error('Error archiving session:', error)
      return
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id, action: 'session_archived', table_name: 'academic_sessions', record_id: id, new_data: { status: 'archived' },
    })

    revalidatePath('/settings/academic')
  } catch (error: any) {
    console.error('Delete session error:', error)
  }
}

export async function deleteTerm(formData: FormData): Promise<void> {
  try {
    const { user } = await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      console.error('Term ID is required')
      return
    }

    const { error } = await supabase
      .from('terms')
      .update({ status: 'archived', is_active: false, closed_at: new Date().toISOString(), closed_by: user.id })
      .eq('id', id)

    if (error) {
      console.error('Error archiving term:', error)
      return
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id, action: 'term_archived', table_name: 'terms', record_id: id, new_data: { status: 'archived' },
    })

    revalidatePath('/settings/academic')
  } catch (error: any) {
    console.error('Delete term error:', error)
  }
}

export async function closeTerm(formData: FormData): Promise<{ closed: boolean; blockers: any[]; warnings: any[] } | void> {
  const { } = await getContext()
  const supabase = await createClient()
  const termId = formData.get('term_id') as string
  const force = formData.get('force') === 'true'

  const { data, error } = await supabase.rpc('close_term', { p_term_id: termId, p_force: force })
  if (error) {
    console.error('Error closing term:', error)
    return
  }
  revalidatePath('/settings/academic')
  return data
}

export async function closeSession(formData: FormData): Promise<{ closed: boolean; blockers: any[] } | void> {
  await getContext()
  const supabase = await createClient()
  const sessionId = formData.get('session_id') as string

  const { data, error } = await supabase.rpc('close_session', { p_session_id: sessionId })
  if (error) {
    console.error('Error closing session:', error)
    return
  }
  revalidatePath('/settings/academic')
  return data
}

export async function setCurrentTerm(formData: FormData): Promise<void> {
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
        return
      }
    } else {
      const { error } = await supabase
        .from('users')
        .update({ current_term_id: termId || null })
        .eq('id', user.id)
      
      if (error) {
        console.error('Error updating user term:', error)
        return
      }
    }

    revalidatePath('/settings/academic')
    revalidatePath('/reports/generate')
  } catch (error: any) {
    console.error('Set current term error:', error)
  }
}