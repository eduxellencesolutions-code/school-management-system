import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives')
    .select('id, phone, photo_status, status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  const { data: latestVersion } = await supabase
    .from('representative_agreement_versions')
    .select('id').order('version', { ascending: false }).limit(1).single()

  if (!latestVersion) {
    return NextResponse.json({ error: 'No representative agreement has been published yet' }, { status: 500 })
  }

  const { data: acceptance } = await supabase
    .from('representative_agreement_acceptances')
    .select('id')
    .eq('representative_id', rep.id)
    .eq('agreement_version_id', latestVersion.id)
    .maybeSingle()

  const steps = {
    profile_completed: !!rep.phone,
    passport_uploaded: rep.photo_status !== 'not_submitted',
    passport_approved: rep.photo_status === 'approved',
    agreement_accepted: !!acceptance,
  }
  const completed = Object.values(steps).filter(Boolean).length
  const total = Object.keys(steps).length

  return NextResponse.json({
    steps,
    percent: Math.round((completed / total) * 100),
    fullyOnboarded: completed === total,
  })
}