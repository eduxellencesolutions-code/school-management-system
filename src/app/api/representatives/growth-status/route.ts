import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives')
    .select('id, qualified_customers_count, commission_rate')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  const { data: tiers } = await supabase
    .from('growth_level_thresholds')
    .select('level, label, min_schools, commission_rate')
    .order('level', { ascending: true })

  const sorted = tiers ?? []
  let current = sorted[0]
  let next = null
  for (let i = 0; i < sorted.length; i++) {
    if (rep.qualified_customers_count >= sorted[i].min_schools) {
      current = sorted[i]
      next = sorted[i + 1] ?? null
    }
  }

  const schoolsIntoLevel = rep.qualified_customers_count - (current?.min_schools ?? 0)
  const schoolsForLevel = next ? next.min_schools - (current?.min_schools ?? 0) : 0
  const progressPct = next ? Math.min(100, Math.round((schoolsIntoLevel / schoolsForLevel) * 100)) : 100

  return NextResponse.json({
    currentLevel: current?.level ?? 1,
    currentLabel: current?.label ?? 'Starter',
    currentCommissionRate: Number(rep.commission_rate),
    qualifiedCount: rep.qualified_customers_count,
    nextLevel: next?.level ?? null,
    nextLabel: next?.label ?? null,
    nextCommissionRate: next ? Number(next.commission_rate) : null,
    schoolsNeededForNext: next ? next.min_schools - rep.qualified_customers_count : 0,
    progressPct,
  })
}
