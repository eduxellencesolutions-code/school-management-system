import { SupabaseClient } from '@supabase/supabase-js'
import { INSTITUTION_PLAN_ORDER, InstitutionPlanKey } from './institutionTiers'

/**
 * For each given feature key, finds the lowest institution plan tier
 * (Small -> Standard -> Premium) that has it enabled, by reading the real
 * plan_features table -- never hardcoded. Used to drive "upgrade to X"
 * messaging that can never go stale or point in the wrong direction, since
 * there's nothing left to hand-type per feature.
 *
 * Returns null for a feature key that isn't enabled on ANY institution tier
 * (the UI should treat that as "not available to institutions" rather than
 * showing a broken upgrade prompt).
 */
export async function getRequiredPlanMap(
  supabase: SupabaseClient,
  featureKeys: string[]
): Promise<Record<string, InstitutionPlanKey | null>> {
  const map: Record<string, InstitutionPlanKey | null> = {}
  for (const key of featureKeys) map[key] = null
  if (featureKeys.length === 0) return map

  const { data, error } = await supabase
    .from('plan_features')
    .select('plan_tier, feature_key, is_enabled')
    .in('feature_key', featureKeys)
    .in('plan_tier', INSTITUTION_PLAN_ORDER as unknown as string[])
    .eq('is_enabled', true)

  if (error || !data) return map

  for (const key of featureKeys) {
    let best: InstitutionPlanKey | null = null
    let bestIndex = Infinity
    for (const row of data) {
      if (row.feature_key !== key) continue
      const idx = INSTITUTION_PLAN_ORDER.indexOf(row.plan_tier as InstitutionPlanKey)
      if (idx !== -1 && idx < bestIndex) {
        bestIndex = idx
        best = row.plan_tier as InstitutionPlanKey
      }
    }
    map[key] = best
  }

  return map
}