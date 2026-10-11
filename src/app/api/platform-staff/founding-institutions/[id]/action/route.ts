// src/app/api/platform-staff/founding-institutions/[id]/action/route.ts
export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })

  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const action = String(body.action ?? '')
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  let result
  switch (action) {
    case 'start_review':
      result = await supabase.rpc('start_founding_application_review', { p_application_id: id })
      break
    case 'qualify':
      result = await supabase.rpc('qualify_founding_application', { p_application_id: id, p_reason: reason || null })
      break
    case 'reject':
      if (!reason) return NextResponse.json({ error: 'A reason is required' }, { status: 400 })
      result = await supabase.rpc('reject_founding_application', { p_application_id: id, p_reason: reason })
      break
    case 'link_organization': {
      const organizationId = String(body.organizationId ?? '')
      if (!UUID.test(organizationId)) return NextResponse.json({ error: 'Invalid organization' }, { status: 400 })
      result = await supabase.rpc('link_founding_application_organization', { p_application_id: id, p_org_id: organizationId })
      break
    }
    case 'set_agreement': {
      const price = Number(body.price)
      if (!body.tierKey || !body.currency || !Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Tier, currency and a non-negative price are required' }, { status: 400 })
      }
      result = await supabase.rpc('set_founding_agreement', {
        p_application_id: id, p_tier_key: String(body.tierKey), p_price: price, p_currency: String(body.currency),
      })
      break
    }
    case 'start_pilot':
      result = await supabase.rpc('start_founding_application_pilot', { p_application_id: id })
      break
    case 'complete_pilot':
      result = await supabase.rpc('complete_founding_application_pilot', { p_application_id: id, p_notes: reason || null })
      break
    case 'waive':
      if (!reason) return NextResponse.json({ error: 'A waiver reason is required' }, { status: 400 })
      result = await supabase.rpc('convert_founding_application', { p_application_id: id, p_notes: reason })
      break
    case 'close': {
      const outcome = String(body.outcome ?? '')
      if (!['withdrawn', 'lapsed'].includes(outcome)) return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
      if (!reason) return NextResponse.json({ error: 'A reason is required' }, { status: 400 })
      result = await supabase.rpc('close_founding_application', { p_application_id: id, p_outcome: outcome, p_reason: reason })
      break
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 400 })
  return NextResponse.json({ success: true, data: result.data })
}