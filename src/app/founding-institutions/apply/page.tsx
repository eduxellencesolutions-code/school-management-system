// src/app/founding-institutions/apply/page.tsx
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import ApplyClient from './ApplyClient'

export default async function FoundingInstitutionsApplyPage() {
  const supabase = await createClient()
  const { data: campaign } = await supabase
    .from('founding_institution_campaigns')
    .select('campaign_key, name, description, benefits, eligibility_criteria, terms_and_notes, pilot_duration_days, max_institutions')
    .eq('campaign_key', 'founding_50_higher_institutions')
    .maybeSingle()
  // RLS (status = 'active') means this returns null while the campaign is draft —
  // ApplyClient shows a "not currently open" state in that case, which doubles as
  // a live confirmation that the draft row is correctly invisible.

  return <ApplyClient campaign={campaign} />
}