export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import ApplyClient from './ApplyClient'

export default async function FoundingInstitutionsApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const supabase = await createClient()
  const { data: campaign } = await supabase
    .from('founding_institution_campaigns')
    .select('campaign_key, name, description, benefits, eligibility_criteria, terms_and_notes, pilot_duration_days, max_institutions')
    .eq('campaign_key', 'founding_50_higher_institutions')
    .maybeSingle()

  return <ApplyClient campaign={campaign} initialReferralCode={(ref ?? '').slice(0, 40)} />
}