// src/lib/subscription/getPlanFeatures.ts
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Real source of truth for plan-based feature access, backed by the
 * plan_features table, MERGED with any active feature_overrides for the
 * organization (e.g. Founding 500 promotional grants, or any other
 * manually-granted feature). Without this merge, feature_overrides rows
 * are written correctly by enroll_founding_500() but silently ignored by
 * every UI surface that calls this function -- confirmed root cause of
 * Founding 500 schools seeing locked/upgrade-prompt feature cards despite
 * having valid override grants in the database.
 */
export async function getPlanFeatures(
  supabase: SupabaseClient,
  planKey: string | null | undefined,
  organizationId?: string | null
): Promise<string[]> {
  const planFeaturesPromise = planKey
    ? supabase.from('plan_features').select('feature_key').eq('plan_tier', planKey).eq('is_enabled', true)
    : Promise.resolve({ data: [], error: null })

  const overridesPromise = organizationId
    ? supabase
        .from('feature_overrides')
        .select('feature_key, enabled, expires_at')
        .eq('organization_id', organizationId)
    : Promise.resolve({ data: [], error: null })

  const [{ data: planFeatures, error: planError }, { data: overrides, error: overrideError }] =
    await Promise.all([planFeaturesPromise, overridesPromise])

  const baseKeys = new Set<string>(planError || !planFeatures ? [] : planFeatures.map((r) => r.feature_key))

  if (!overrideError && overrides) {
    const now = Date.now()
    for (const o of overrides) {
      const stillActive = !o.expires_at || new Date(o.expires_at).getTime() > now
      if (o.enabled && stillActive) {
        baseKeys.add(o.feature_key)
      } else {
        // An override can also explicitly REVOKE a feature the plan would
        // otherwise grant (enabled: false) -- honor that by removing it,
        // even though no current caller in this codebase does that yet.
        baseKeys.delete(o.feature_key)
      }
    }
  }

  return Array.from(baseKeys)
}