// src/app/api/platform-staff/founding-institutions/route.ts
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  // RLS (founding_apps_staff_all / founding_campaigns_staff_all) already restricts
  // correctly for a super-admin to see everything — no service-role client needed.
  const { data: campaign } = await supabase
    .from('founding_institution_campaigns')
    .select('id, max_institutions')
    .eq('campaign_key', 'founding_50_higher_institutions')
    .maybeSingle()

  const { data: apps, error } = await supabase
    .from('founding_institution_applications')
    .select('id, institution_name, contact_name, contact_email, status, status_reason, created_at')
    .eq('campaign_id', campaign?.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const heldPlaces = (apps ?? []).filter(a =>
    ['qualified', 'pilot_active', 'pilot_complete', 'converted'].includes(a.status)
  ).length

  return NextResponse.json({
    applications: apps ?? [],
    placesRemaining: campaign ? campaign.max_institutions - heldPlaces : null,
  })
}