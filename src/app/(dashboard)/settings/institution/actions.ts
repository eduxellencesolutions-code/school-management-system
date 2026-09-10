// FILE: src/app/(dashboard)/settings/institution/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function setInstitutionType(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id
  const type = formData.get('type') as string

  if (!orgId) redirect('/settings/institution?error=' + encodeURIComponent('No organization found for your account'))

  const { error } = await supabase.rpc('set_organization_type', { p_org_id: orgId, p_type: type })
  if (error) redirect('/settings/institution?error=' + encodeURIComponent(error.message))

  redirect('/settings/institution?success=' + encodeURIComponent('Institution type updated'))
}

export async function setGradingScale(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id
  const scale = formData.get('scale') as string

  if (!orgId) redirect('/settings/institution?error=' + encodeURIComponent('No organization found for your account'))

  const { error } = await supabase.rpc('create_tertiary_grading', { p_org_id: orgId, p_scale: scale })
  if (error) redirect('/settings/institution?error=' + encodeURIComponent(error.message))

  redirect('/settings/institution?success=' + encodeURIComponent('Grading scale set to ' + scale.replace('_', '-')))
}