import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Real source of truth for plan-based feature access, backed by the
 * plan_features table (see also the org_has_feature() SQL function for
 * single-feature checks). Replaces the hardcoded PLAN_FEATURES arrays that
 * previously lived in Sidebar.tsx and dashboard/page.tsx independently,
 * which were never updated when Standard schools were given fee management
 * access -- so Standard schools could not see the Fees nav item despite
 * having it enabled in the backend.
 */
export async function getPlanFeatures(supabase: SupabaseClient, planKey: string | null | undefined): Promise<string[]> {
  if (!planKey) return []
  const { data, error } = await supabase
    .from('plan_features')
    .select('feature_key')
    .eq('plan_tier', planKey)
    .eq('is_enabled', true)

  if (error || !data) return []
  return data.map((r) => r.feature_key)
}