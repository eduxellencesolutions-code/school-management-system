import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const DESIGNATIONS: Record<string, string> = {
  growth_volunteer: 'EdTech Growth Volunteer',
  certified_representative: 'Certified Representative',
  state_representative: 'State Representative',
  zonal_representative: 'Zonal Representative',
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const supabase = await createClient()

  const { data } = await supabase.rpc('verify_representative', { p_code: code }).maybeSingle()
  const rep = data as { full_name: string; referral_code: string; level: string; status: string; photo_status: string } | null

  if (!rep) {
    return NextResponse.json({ found: false }, { status: 404 })
  }

  // Deliberately minimal: no email, phone, commission, or internal IDs.
  return NextResponse.json({
    found: true,
    fullName: rep.full_name,
    referralCode: rep.referral_code,
    designation: DESIGNATIONS[rep.level] ?? 'Authorized Representative',
    status: rep.status,
    photoApproved: rep.photo_status === 'approved',
    organization: 'Eduxellence Solutions',
  })
}