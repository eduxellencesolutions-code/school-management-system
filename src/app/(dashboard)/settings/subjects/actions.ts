'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users').select('organization_id').eq('id', user.id).single()

  const name       = (formData.get('name') as string)?.trim()
  const code       = (formData.get('code') as string)?.trim()
  const groupId    = formData.get('group_id') as string
  const templateId = formData.get('template_id') as string

  if (!name || !groupId) return

  await supabase.from('subjects').insert({
    organization_id: profile?.organization_id,
    group_id:    groupId,
    name,
    code:        code || null,
    template_id: templateId || null,
    is_active:   true,
  })

  revalidatePath('/settings/subjects')
  revalidatePath(`/classes/${groupId}`)
  redirect('/settings/subjects')
}

export async function updateSubject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id         = formData.get('id') as string
  const name       = (formData.get('name') as string)?.trim()
  const code       = (formData.get('code') as string)?.trim()
  const groupId    = formData.get('group_id') as string
  const templateId = formData.get('template_id') as string

  if (!name || !groupId || !id) return

  await supabase.from('subjects').update({
    name,
    code:        code || null,
    group_id:    groupId,
    template_id: templateId || null,
  }).eq('id', id)

  revalidatePath('/settings/subjects')
  revalidatePath(`/classes/${groupId}`)
  redirect('/settings/subjects')
}

export async function deleteSubject(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  if (!id) return

  // Soft delete — keep scores intact
  await supabase.from('subjects').update({ is_active: false }).eq('id', id)

  revalidatePath('/settings/subjects')
  redirect('/settings/subjects')
}
