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

  const { data: campaign } = await supabase
    .from('founding_institution_campaigns')
    .select('id, status, max_institutions, pilot_duration_days, pricing_terms')
    .eq('campaign_key', 'founding_50_higher_institutions')
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json({ applications: [], placesRemaining: null, campaign: null, pricing: { tiers: [], prices: [] } })
  }

  const { data: apps, error } = await supabase
    .from('founding_institution_applications')
    .select(`
      id, institution_name, institution_type, contact_name, contact_email, contact_phone,
      estimated_student_count, programmes_offered, application_notes,
      status, status_reason, created_at, pilot_started_at, pilot_ends_at, converted_at,
      conversion_type, waiver_reason, referral_code, representative_id, referral_id, organization_id,
      agreed_tier_key, agreed_price_per_student_per_term, agreed_currency, agreed_locked_at,
      attribution_note, referral_review_reason,
      representative:representatives!founding_institution_applications_representative_id_fkey(full_name, referral_code, status),
      organization:organizations!founding_institution_applications_organization_id_fkey(name, tertiary_plan, subscription_status, subscription_expires_at)
    `)
    .eq('campaign_id', campaign.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const heldPlaces = (apps ?? []).filter(a =>
    ['qualified', 'pilot_active', 'pilot_complete', 'converted'].includes(a.status)
  ).length

  const { data: pricing } = await supabase.rpc('get_public_tertiary_pricing')

  return NextResponse.json({
    applications: apps ?? [],
    placesRemaining: campaign.max_institutions - heldPlaces,
    campaign: {
      status: campaign.status,
      pilotDays: campaign.pilot_duration_days,
      feeAmount: campaign.pricing_terms?.founding_conversion_amount ?? null,
      feeCurrency: campaign.pricing_terms?.founding_conversion_currency ?? null,
    },
    pricing: { tiers: pricing?.tiers ?? [], prices: pricing?.prices ?? [] },
  })
}