// src/app/api/platform-staff/schools/[id]/relationship/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' });
  const { data: isSuper } = await supabase.rpc('is_super_admin');
  if (!canView && !isSuper) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const { data: school, error: schoolError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (schoolError) return NextResponse.json({ error: schoolError.message }, { status: 500 });
  if (!school) return NextResponse.json({ error: 'School not found' }, { status: 404 });

  const [
    { data: history, error: historyError },
    { data: followUps },
    { data: feedback },
    { data: escalations },
    { data: currentAssignment },
    { count: studentCount },
  ] = await Promise.all([
    supabase.rpc('get_school_portfolio_history', { p_organization_id: id }),
    supabase.from('representative_follow_ups')
      .select('*, representatives(full_name)')
      .eq('organization_id', id)
      .order('contact_date', { ascending: false }),
    supabase.from('school_feedback')
      .select('*, representatives(full_name)')
      .eq('organization_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('support_tickets')
      .select('id, subject, status, priority, issue_type, category, created_at, resolved_at, closed_at, attachment_url, representatives(full_name)')
      .eq('organization_id', id)
      .not('representative_id', 'is', null)
      .order('created_at', { ascending: false }),
    supabase.from('school_portfolio_assignments')
      .select('representative_id, representatives(id, full_name, email, phone, level, commission_rate)')
      .eq('organization_id', id)
      .is('unassigned_at', null)
      .maybeSingle(),
    supabase.from('learners').select('id', { count: 'exact', head: true }).eq('organization_id', id),
  ]);

  if (historyError) return NextResponse.json({ error: historyError.message }, { status: 500 });

  // Relationship health lives on the CURRENT rep's row for this school —
  // no meaningful health status exists once a school has no active rep.
  let relationship = null;
  if (currentAssignment?.representative_id) {
    const { data: rel } = await supabase
      .from('representative_school_relationships')
      .select('*')
      .eq('organization_id', id)
      .eq('representative_id', currentAssignment.representative_id)
      .maybeSingle();
    relationship = rel;
  }

  return NextResponse.json({
    school,
    currentRepresentative: currentAssignment?.representatives ?? null,
    relationship,
    portfolioHistory: history,
    followUps: followUps ?? [],
    feedback: feedback ?? [],
    escalations: escalations ?? [],
    studentCount: studentCount ?? 0,
  });
}