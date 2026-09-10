// FILE: src/app/(dashboard)/programmes/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function createProgramme(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  if (!profile?.organization_id) redirect('/programmes/new?error=' + encodeURIComponent('No organization found'))

  const name = formData.get('name') as string
  const code = (formData.get('code') as string) || null
  const departmentId = formData.get('department_id') as string
  const degreeType = (formData.get('degree_type') as string) || null
  const durationYears = formData.get('duration_years') ? Number(formData.get('duration_years')) : null
  const minCreditUnits = formData.get('min_credit_units') ? Number(formData.get('min_credit_units')) : null

  const { error } = await supabase.from('programmes').insert({
    organization_id: profile!.organization_id,
    department_id: departmentId, name, code,
    degree_type: degreeType, duration_years: durationYears, min_credit_units: minCreditUnits,
    created_by: user!.id,
  })

  if (error) redirect('/programmes/new?error=' + encodeURIComponent(error.message))
  redirect('/programmes?success=' + encodeURIComponent('Programme created'))
}