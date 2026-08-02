import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const CATEGORIES = [
  'technical_issue', 'billing_subscription', 'payment_issue', 'login_problem',
  'parent_portal', 'report_card', 'attendance', 'results_promotion',
  'ai_remarks', 'homework', 'fees', 'data_import', 'feature_request',
  'bug_report', 'representative_programme', 'general_enquiry',
]

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, subject, category, status, priority, created_at, updated_at')
    .eq('submitted_by_user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tickets: tickets ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const body = await request.json()
  const { subject, description, category, priority, linkedTicketId } = body  // ✅ Added linkedTicketId

  if (!subject || !description) {
    return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 })
  }
  if (category && !CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  // ✅ Verify linked ticket belongs to this user
  if (linkedTicketId) {
    const { data: priorTicket } = await supabase
      .from('support_tickets')
      .select('submitted_by_user_id')
      .eq('id', linkedTicketId)
      .single()
    if (!priorTicket || priorTicket.submitted_by_user_id !== user.id) {
      return NextResponse.json({ error: 'Invalid linked ticket' }, { status: 400 })
    }
  }

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      organization_id: userRow?.organization_id ?? null,
      submitted_by_user_id: user.id,
      subject,
      category: category ?? 'general_enquiry',
      priority: priority ?? 'normal',
      status: 'new',
      linked_ticket_id: linkedTicketId ?? null,  // ✅ Added
    })
    .select('id')
    .single()

  if (ticketError) return NextResponse.json({ error: ticketError.message }, { status: 500 })

  const { error: messageError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticket.id,
      sender_user_id: user.id,
      is_internal_note: false,
      body: description,
    })

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })

  // ✅ Log the link creation if a previous ticket was linked
  if (linkedTicketId) {
    await supabase.rpc('log_platform_action', {
      p_actor_id: user.id,
      p_action: 'linked_ticket_created',
      p_target_type: 'support_tickets',
      p_target_id: ticket.id,
      p_reason: `New ticket linked to previous closed ticket ${linkedTicketId}`,
      p_metadata: { linkedTicketId },
    })
  }

  return NextResponse.json({ success: true, ticketId: ticket.id })
}