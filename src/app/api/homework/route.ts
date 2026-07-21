import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/homework — create an assignment
// Body: { groupId, subjectId, title, issuedDate, dueDate }
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { groupId, subjectId, title, issuedDate, dueDate } = body;

  if (!groupId || !subjectId || !title || !issuedDate || !dueDate) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Resolve org through the group — never trust client-supplied org id
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('organization_id')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const isSolo = group.organization_id === null;

  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', {
        p_org_id: group.organization_id,
        p_feature_key: 'homework',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Homework tracking is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  const { data: assignment, error: insertError } = await supabase
    .from('homework_assignments')
    .insert({
      group_id: groupId,
      subject_id: subjectId,
      title,
      issued_date: issuedDate,
      due_date: dueDate,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, assignment });
}

// GET /api/homework?groupId=...
export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Missing groupId' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('homework_assignments')
    .select('id, subject_id, title, issued_date, due_date')
    .eq('group_id', groupId)
    .order('due_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assignments: data });
}
