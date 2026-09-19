// src/lib/plans/tertiaryEntitlements.ts
import { SupabaseClient } from '@supabase/supabase-js'

export interface TertiaryTier {
  tier_key: string
  name: string
  min_students: number
  max_students: number | null
  price_per_student_per_term: number | null
  is_custom: boolean
  is_active: boolean
}

// Fetches the org's assigned tier row directly from the database —
// no hardcoded tier data anywhere in this file.
export async function getOrgTertiaryTier(
  supabase: SupabaseClient,
  organizationId: string
): Promise<TertiaryTier | null> {
  const { data: org } = await supabase
    .from('organizations')
    .select('tertiary_plan')
    .eq('id', organizationId)
    .single()

  if (!org?.tertiary_plan) return null

  const { data: tier } = await supabase
    .from('tertiary_pricing_tiers')
    .select('*')
    .eq('tier_key', org.tertiary_plan)
    .single()

  return tier ?? null
}

// Tertiary equivalent of getPlanFeatures() — reads tertiary_plan_capabilities
// directly. No override mechanism exists for tertiary yet (confirmed: no
// tertiary_feature_overrides table exists in the schema), so this only
// returns the tier's base capability set — nothing merged in.
export async function getTertiaryCapabilities(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string[]> {
  const tier = await getOrgTertiaryTier(supabase, organizationId)
  if (!tier) return []

  const { data: capabilities } = await supabase
    .from('tertiary_plan_capabilities')
    .select('capability_key')
    .eq('tier_key', tier.tier_key)
    .eq('is_enabled', true)

  return (capabilities ?? []).map(c => c.capability_key)
}