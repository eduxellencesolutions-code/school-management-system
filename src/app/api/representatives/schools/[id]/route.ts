// src/app/api/representatives/schools/[id]/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase.from('representatives').select('id').eq('user_id', user.id).single();
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  // RLS on organizations restricts this to attributed schools already —
  // a non-attributed id returns no row, not an error.
  const { data: school, error: schoolError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 });
  if (!school) return NextResponse.json({ error: 'School not found or not accessible' }, { status: 404 });

  // Fetch ticket IDs first for the messages query
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('organization_id', id)
    .eq('representative_id', rep.id);

  const ticketIds = (tickets ?? []).map(t => t.id);

  const [{ data: referral }, { data: relationship }, { data: followUps }, { data: escalations }, { data: feedback }, { data: messages }, { count: studentCount }] = await Promise.all([
    supabase.from('referrals').select('referred_at, qualified_at, referral_code, status').eq('organization_id', id).eq('representative_id', rep.id).maybeSingle(),
    supabase.from('representative_school_relationships').select('*').eq('organization_id', id).eq('representative_id', rep.id).maybeSingle(),
    supabase.from('representative_follow_ups').select('*').eq('organization_id', id).eq('representative_id', rep.id).order('contact_date', { ascending: false }),
    supabase.from('support_tickets').select('id, subject, status, priority, issue_type, category, created_at, resolved_at').eq('organization_id', id).eq('representative_id', rep.id).order('created_at', { ascending: false }),
    supabase.from('school_feedback').select('*').eq('organization_id', id).eq('representative_id', rep.id).order('created_at', { ascending: false }),
    ticketIds.length > 0
      ? supabase.from('support_ticket_messages')
          .select('id, ticket_id, body, created_at, sender_user_id')
          .in('ticket_id', ticketIds)
          .eq('is_internal_note', false)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
    // Student count is not stored anywhere — counted live from learners.
    // RLS on learners restricts this to org-scoped staff normally, but this
    // route runs as the authenticated rep, so we go through a count-only
    // head request rather than pulling full rows (cheaper, no PII exposure).
    supabase.from('learners').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ]);

  const { error: viewLogError } = await supabase.rpc('log_school_profile_view', { p_organization_id: id });
  if (viewLogError) console.error('Failed to log profile view:', viewLogError);

  return NextResponse.json({
    school,
    referral,
    relationship,
    followUps: followUps ?? [],
    escalations: escalations ?? [],
    feedback: feedback ?? [],
    messages: messages ?? [],
    studentCount: studentCount ?? 0,
  });
}