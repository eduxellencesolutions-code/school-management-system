import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const DESIGNATIONS: Record<string, string> = {
  growth_volunteer: 'EdTech Growth Volunteer',
  certified_representative: 'Certified Representative',
  state_representative: 'State Representative',
  zonal_representative: 'Zonal Representative',
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canView) return NextResponse.json({ error: 'You do not have permission to view representative ID cards' }, { status: 403 })

  const { data: rep } = await supabase
    .from('representatives')
    .select('id, full_name, referral_code, level, status, photo_url, photo_status, photo_reviewed_at, qualified_customers_count, commission_rate')
    .eq('id', id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'Representative not found' }, { status: 404 })

  const { data: latestVersion } = await supabase
    .from('representative_agreement_versions')
    .select('id')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const agreementAccepted = latestVersion
    ? !!(await supabase
        .from('representative_agreement_acceptances')
        .select('id')
        .eq('representative_id', rep.id)
        .eq('agreement_version_id', latestVersion.id)
        .maybeSingle()).data
    : false

  const missing: string[] = []
  if (!agreementAccepted) missing.push('Representative Agreement not yet accepted')
  if (rep.photo_status !== 'approved') missing.push('Passport photograph not yet approved')
  if (rep.status !== 'active') missing.push('Representative account is not active')

  if (missing.length > 0) {
    return NextResponse.json({ eligible: false, missing })
  }

  const { data: signed } = await supabase.storage.from('representative-passports').createSignedUrl(rep.photo_url!, 300)

  const { data: logoSetting } = await supabase.from('platform_settings').select('value').eq('key', 'company_logo').maybeSingle()
  const logoUrl = (logoSetting?.value as any)?.url ?? null

  const { data: showCommissionSetting } = await supabase.from('platform_settings').select('value').eq('key', 'id_card_show_commission').maybeSingle()
  const showCommission = showCommissionSetting?.value === true

  const { data: tiers } = await supabase
    .from('growth_level_thresholds')
    .select('level, label, min_schools, commission_rate')
    .order('level', { ascending: true })

  const sorted = tiers ?? []
  let currentTier = sorted[0]
  for (const t of sorted) {
    if (rep.qualified_customers_count >= t.min_schools) currentTier = t
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const verifyUrl = siteUrl + '/verify/' + rep.referral_code

  return NextResponse.json({
    eligible: true,
    representative: {
      fullName: rep.full_name,
      referralCode: rep.referral_code,
      designation: DESIGNATIONS[rep.level] ?? 'Authorized Representative',
      status: rep.status,
      issuedOn: rep.photo_reviewed_at,
    },
    badge: {
      label: currentTier?.label ?? 'Starter',
      commissionRate: showCommission ? Number(currentTier?.commission_rate ?? rep.commission_rate) : null,
    },
    photoUrl: signed?.signedUrl ?? null,
    logoUrl,
    verifyUrl,
  })
}