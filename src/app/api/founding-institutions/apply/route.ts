export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const supabase = await createClient()

  const referralCode = typeof body.referralCode === 'string'
    ? body.referralCode.trim().toUpperCase().slice(0, 40)
    : ''

  const { data, error } = await supabase.rpc('submit_founding_institution_application', {
    p_campaign_key: body.campaignKey,
    p_institution_name: body.institutionName,
    p_institution_type: body.institutionType,
    p_contact_name: body.contactName,
    p_contact_email: body.contactEmail,
    p_contact_phone: body.contactPhone || null,
    p_estimated_student_count: body.estimatedStudentCount ? Number(body.estimatedStudentCount) : null,
    p_programmes_offered: body.programmesOffered || null,
    p_application_notes: body.applicationNotes || null,
    p_referral_code: referralCode || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}