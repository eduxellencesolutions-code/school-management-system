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
  const { user, orgId } = await getContext()
  const supabase = await createClient()

  const name = (formData.get('name') as string)?.trim()
  if (!name) return

  const { error } = await supabase.from('academic_sessions').insert({
    organization_id: orgId,
    instructor_id: orgId ? null : user.id,
    name,
    is_active: true,
  })

  if (error) console.error('Error creating session:', error)
  revalidatePath('/settings/academic')
}

export async function createTerm(formData: FormData) {
  const { user, orgId } = await getContext()
  const supabase = await createClient()

  const sessionId = formData.get('session_id') as string
  const name = (formData.get('name') as string)?.trim()
  if (!sessionId || !name) return

  const { error } = await supabase.from('terms').insert({
    organization_id: orgId,
    instructor_id: orgId ? null : user.id,
    session_id: sessionId,
    name,
    is_active: true,
  })

  if (error) console.error('Error creating term:', error)
  revalidatePath('/settings/academic')
}

export async function deleteSession(formData: FormData) {
  await getContext()
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('terms').delete().eq('session_id', id)
  await supabase.from('academic_sessions').delete().eq('id', id)
  revalidatePath('/settings/academic')
}

export async function deleteTerm(formData: FormData) {
  await getContext()
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) return

  await supabase.from('terms').delete().eq('id', id)
  revalidatePath('/settings/academic')
}

export async function setCurrentTerm(formData: FormData) {
  const { user, orgId } = await getContext()
  const supabase = await createClient()
  const termId = formData.get('term_id') as string

  if (orgId) {
    await supabase.from('organizations').update({ current_term_id: termId || null }).eq('id', orgId)
  } else {
    await supabase.from('users').update({ current_term_id: termId || null }).eq('id', user.id)
  }

  revalidatePath('/settings/academic')
  revalidatePath('/reports/generate')
}