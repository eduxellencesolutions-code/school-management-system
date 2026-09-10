// FILE: src/app/(dashboard)/cohorts/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createCohort(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  if (!profile?.organization_id) redirect('/cohorts/new?error=' + encodeURIComponent('No organization found'))

  const name = formData.get('name') as string
  const code = (formData.get('code') as string) || null
  const programmeId = formData.get('programme_id') as string
  const departmentId = (formData.get('department_id') as string) || null
  const level = (formData.get('level') as string) || null
  const sessionId = (formData.get('session_id') as string) || null
  const termId = (formData.get('term_id') as string) || null

  const { error } = await supabase.from('groups').insert({
    organization_id: profile!.organization_id,
    name, code, type: 'cohort',
    programme_id: programmeId, department_id: departmentId, level,
    session_id: sessionId, term_id: termId,
  })

  if (error) redirect('/cohorts/new?error=' + encodeURIComponent(error.message))
  redirect('/cohorts?success=' + encodeURIComponent('Cohort created'))
}