'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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

export async function createSession(formData: FormData): Promise<void> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const name = (formData.get('name') as string)?.trim()
    if (!name) {
      console.error('Session name is required')
      return
    }

    console.log('Creating session for:', { userId: user.id, orgId })

    const { error } = await supabase.from('academic_sessions').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      name,
      is_active: true,
      // Remove created_by - column doesn't exist
    })

    if (error) {
      console.error('Error creating session:', error)
      return
    }

    console.log('Session created successfully')
    revalidatePath('/settings/academic')
  } catch (error) {
    console.error('Create session error:', error)
  }
}

export async function createTerm(formData: FormData): Promise<void> {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const sessionId = formData.get('session_id') as string
    const name = (formData.get('name') as string)?.trim()
    
    if (!sessionId) {
      console.error('Session ID is required')
      return
    }
    if (!name) {
      console.error('Term name is required')
      return
    }

    console.log('Creating term for:', { userId: user.id, orgId, sessionId })

    const { error } = await supabase.from('terms').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      session_id: sessionId,
      name,
      is_active: true,
      // Remove created_by - column doesn't exist
    })

    if (error) {
      console.error('Error creating term:', error)
      return
    }

    console.log('Term created successfully')
    revalidatePath('/settings/academic')
  } catch (error) {
    console.error('Create term error:', error)
  }
}

export async function deleteSession(formData: FormData): Promise<void> {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      console.error('Session ID is required')
      return
    }

    // Delete all terms in this session first
    await supabase.from('terms').delete().eq('session_id', id)
    const { error } = await supabase.from('academic_sessions').delete().eq('id', id)
    
    if (error) {
      console.error('Error deleting session:', error)
      return
    }

    revalidatePath('/settings/academic')
  } catch (error) {
    console.error('Delete session error:', error)
  }
}

export async function deleteTerm(formData: FormData): Promise<void> {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      console.error('Term ID is required')
      return
    }

    const { error } = await supabase.from('terms').delete().eq('id', id)
    if (error) {
      console.error('Error deleting term:', error)
      return
    }

    revalidatePath('/settings/academic')
  } catch (error) {
    console.error('Delete term error:', error)
  }
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
  } catch (error) {
    console.error('Set current term error:', error)
  }
}
