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

export async function createSession(formData: FormData) {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const name = (formData.get('name') as string)?.trim()
    if (!name) {
      return { success: false, message: 'Session name is required' }
    }

    console.log('Creating session for:', { userId: user.id, orgId })

    const { data: session, error } = await supabase.from('academic_sessions').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      name,
      is_active: true,
      created_by: user.id,
    }).select().single()

    if (error) {
      console.error('Error creating session:', error)
      return { success: false, message: error.message }
    }

    console.log('Session created:', session)
    revalidatePath('/settings/academic')
    return { success: true, session }
  } catch (error) {
    console.error('Create session error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to create session' }
  }
}

export async function createTerm(formData: FormData) {
  try {
    const { user, orgId } = await getContext()
    const supabase = await createClient()

    const sessionId = formData.get('session_id') as string
    const name = (formData.get('name') as string)?.trim()
    
    if (!sessionId) {
      return { success: false, message: 'Session ID is required' }
    }
    if (!name) {
      return { success: false, message: 'Term name is required' }
    }

    console.log('Creating term for:', { userId: user.id, orgId, sessionId })

    const { data: term, error } = await supabase.from('terms').insert({
      organization_id: orgId,
      instructor_id: orgId ? null : user.id,
      session_id: sessionId,
      name,
      is_active: true,
      created_by: user.id,
    }).select().single()

    if (error) {
      console.error('Error creating term:', error)
      return { success: false, message: error.message }
    }

    console.log('Term created:', term)
    revalidatePath('/settings/academic')
    return { success: true, term }
  } catch (error) {
    console.error('Create term error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to create term' }
  }
}

export async function deleteSession(formData: FormData) {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      return { success: false, message: 'Session ID is required' }
    }

    // Delete all terms in this session first
    await supabase.from('terms').delete().eq('session_id', id)
    const { error } = await supabase.from('academic_sessions').delete().eq('id', id)
    
    if (error) {
      console.error('Error deleting session:', error)
      return { success: false, message: error.message }
    }

    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error) {
    console.error('Delete session error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete session' }
  }
}

export async function deleteTerm(formData: FormData) {
  try {
    await getContext()
    const supabase = await createClient()
    const id = formData.get('id') as string
    if (!id) {
      return { success: false, message: 'Term ID is required' }
    }

    const { error } = await supabase.from('terms').delete().eq('id', id)
    if (error) {
      console.error('Error deleting term:', error)
      return { success: false, message: error.message }
    }

    revalidatePath('/settings/academic')
    return { success: true }
  } catch (error) {
    console.error('Delete term error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to delete term' }
  }
}

export async function setCurrentTerm(formData: FormData) {
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
        return { success: false, message: error.message }
      }
    } else {
      const { error } = await supabase
        .from('users')
        .update({ current_term_id: termId || null })
        .eq('id', user.id)
      
      if (error) {
        console.error('Error updating user term:', error)
        return { success: false, message: error.message }
      }
    }

    revalidatePath('/settings/academic')
    revalidatePath('/reports/generate')
    return { success: true }
  } catch (error) {
    console.error('Set current term error:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Failed to set current term' }
  }
}
