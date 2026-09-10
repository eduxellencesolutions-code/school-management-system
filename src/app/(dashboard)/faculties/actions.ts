// FILE: src/app/(dashboard)/faculties/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createFaculty(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  if (!profile?.organization_id) redirect('/faculties/new?error=' + encodeURIComponent('No organization found'))

  const name = formData.get('name') as string
  const code = (formData.get('code') as string) || null
  const description = (formData.get('description') as string) || null

  const { error } = await supabase.from('faculties').insert({
    organization_id: profile!.organization_id,
    name, code, description, created_by: user!.id,
  })

  if (error) redirect('/faculties/new?error=' + encodeURIComponent(error.message))
  redirect('/faculties?success=' + encodeURIComponent('Faculty created'))
}