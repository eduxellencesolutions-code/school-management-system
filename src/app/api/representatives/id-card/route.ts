import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DESIGNATIONS: Record<string, string> = {
  growth_volunteer: 'EdTech Growth Volunteer',
  certified_representative: 'Certified Representative',
  state_representative: 'State Representative',
  zonal_representative: 'Zonal Representative',
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives')
    .select('id, full_name, referral_code, level, status, photo_url, photo_status, photo_reviewed_at')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

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
  if (rep.photo_status !== 'approved') missing.push('Passport photograph not yet approved by Super Admin')
  if (rep.status !== 'active') missing.push('Representative account is not active')

  if (missing.length > 0) {
    return NextResponse.json({ eligible: false, missing })
  }

  const { data: signed } = await supabase.storage.from('representative-passports').createSignedUrl(rep.photo_url!, 300)

  const { data: logoSetting } = await supabase.from('platform_settings').select('value').eq('key', 'company_logo').maybeSingle()
  const logoUrl = (logoSetting?.value as any)?.url ?? null

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const verifyUrl = `${siteUrl}/verify/${rep.referral_code}`

  return NextResponse.json({
    eligible: true,
    representative: {
      fullName: rep.full_name,
      referralCode: rep.referral_code,
      designation: DESIGNATIONS[rep.level] ?? 'Authorized Representative',
      status: 'Authorized Representative',
      issuedOn: rep.photo_reviewed_at,
    },
    photoUrl: signed?.signedUrl ?? null,
    logoUrl,
    verifyUrl,
  })
}
