// FILE: src/app/(dashboard)/departments/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createDepartment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  if (!profile?.organization_id) redirect('/departments/new?error=' + encodeURIComponent('No organization found'))

  const name = formData.get('name') as string
  const code = (formData.get('code') as string) || null
  const facultyId = formData.get('faculty_id') as string

  const { error } = await supabase.from('departments').insert({
    organization_id: profile!.organization_id,
    faculty_id: facultyId, name, code, created_by: user!.id,
  })

  if (error) redirect('/departments/new?error=' + encodeURIComponent(error.message))
  redirect('/departments?success=' + encodeURIComponent('Department created'))
}