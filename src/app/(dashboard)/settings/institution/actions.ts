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

  const scaleType = 'tertiary_' + scale

  // FIX: previously always called create_tertiary_grading, which resets
  // that scale's grade bands to hardcoded defaults every time — silently
  // discarding any prior customization. Now: if a config for this
  // scale_type already exists for the org, just reactivate it
  // (set_active_tertiary_grading_scale preserves whatever grade bands
  // it already has). Only create fresh defaults on genuine first use.
  const { data: existing } = await supabase
    .from('grading_scale_configs')
    .select('id')
    .eq('organization_id', orgId)
    .eq('scale_type', scaleType)
    .maybeSingle()

  const { error } = existing
    ? await supabase.rpc('set_active_tertiary_grading_scale', { p_org_id: orgId, p_scale_type: scaleType })
    : await supabase.rpc('create_tertiary_grading', { p_org_id: orgId, p_scale: scale })

  if (error) redirect('/settings/institution?error=' + encodeURIComponent(error.message))

  redirect('/settings/institution?success=' + encodeURIComponent('Grading scale set to ' + scale.replace('_', '-')))
}

export async function setTertiaryPlan(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user!.id).single()
  const orgId = profile?.organization_id
  const tierKey = formData.get('tier_key') as string
  const billingCycle = formData.get('billing_cycle') as string

  if (!orgId) redirect('/settings/institution?error=' + encodeURIComponent('No organization found for your account'))

  const { error } = await supabase.rpc('set_tertiary_plan', {
    p_org_id: orgId,
    p_tier_key: tierKey,
    p_billing_cycle: billingCycle,
  })
  if (error) redirect('/settings/institution?error=' + encodeURIComponent(error.message))

  redirect('/settings/institution?success=' + encodeURIComponent('Billing plan updated'))
}