// src/app/api/representatives/escalations/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase.from('representatives').select('id').eq('user_id', user.id).single();
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, subject, status, priority, issue_type, organization_id, created_at, resolved_at, closed_at')
    .eq('representative_id', rep.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const orgIds = [...new Set((tickets ?? []).map(t => t.organization_id).filter(Boolean))];
  const { data: orgs } = orgIds.length > 0
    ? await supabase.from('organizations').select('id, name').in('id', orgIds)
    : { data: [] };
  const orgMap = new Map((orgs ?? []).map(o => [o.id, o.name]));

  return NextResponse.json({
    escalations: (tickets ?? []).map(t => ({ ...t, schoolName: orgMap.get(t.organization_id) ?? null })),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { organizationId, issueType, title, description, priority, attachmentUrl } = body;

  if (!organizationId || !issueType || !title || !description) {
    return NextResponse.json({ error: 'organizationId, issueType, title and description are required' }, { status: 400 });
  }

  const { data: ticketId, error } = await supabase.rpc('create_school_escalation', {
    p_organization_id: organizationId,
    p_issue_type: issueType,
    p_title: title,
    p_description: description,
    p_priority: priority ?? 'normal',
    p_attachment_url: attachmentUrl ?? null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ success: true, ticketId });
}