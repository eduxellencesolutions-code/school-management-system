import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function GET(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (userError || !userRow) {
    return NextResponse.json({ error: 'Could not resolve user profile' }, { status: 500 });
  }

  if (userRow.organization_id === null) {
    return NextResponse.json({ error: 'This feature is not available for solo teacher accounts' }, { status: 403 });
  }

  if (userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can manage parent accounts' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();

  // Get every learner belonging to this org, to scope which parents are actually "ours"
  const { data: orgLearners, error: learnersError } = await supabase
    .from('learners')
    .select('id, first_name, last_name, admission_number, group_id')
    .eq('organization_id', userRow.organization_id);

  if (learnersError) {
    return NextResponse.json({ error: learnersError.message }, { status: 500 });
  }

  const orgLearnerIds = (orgLearners ?? []).map((l) => l.id);
  const learnerMap = new Map((orgLearners ?? []).map((l) => [l.id, l]));

  if (orgLearnerIds.length === 0) {
    return NextResponse.json({ parents: [] });
  }

  // Every link touching one of this org's learners
  const { data: links, error: linksError } = await supabase
    .from('parent_learner_links')
    .select('parent_id, learner_id, relationship')
    .in('learner_id', orgLearnerIds);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  const parentIds = [...new Set((links ?? []).map((l) => l.parent_id))];

  if (parentIds.length === 0) {
    return NextResponse.json({ parents: [] });
  }

  const { data: parents, error: parentsError } = await supabase
    .from('parent_accounts')
    .select('id, full_name, email, phone, access_code, access_code_active, access_code_regenerated_at, created_at')
    .in('id', parentIds);

  if (parentsError) {
    return NextResponse.json({ error: parentsError.message }, { status: 500 });
  }

  // Class names for display
  const groupIds = [...new Set((orgLearners ?? []).map((l) => l.group_id).filter(Boolean))];
  const { data: groups } = await supabase
    .from('groups')
    .select('id, name')
    .in('id', groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']);
  const groupMap = new Map((groups ?? []).map((g) => [g.id, g.name]));

  const linksByParent = new Map<string, Array<{ learner_id: string; relationship: string }>>();
  (links ?? []).forEach((l) => {
    if (!linksByParent.has(l.parent_id)) linksByParent.set(l.parent_id, []);
    linksByParent.get(l.parent_id)!.push(l);
  });

  let result = (parents ?? []).map((parent) => {
    const parentLinks = linksByParent.get(parent.id) ?? [];
    const children = parentLinks
      .map((link) => {
        const learner = learnerMap.get(link.learner_id);
        if (!learner) return null;
        return {
          id: learner.id,
          name: `${learner.first_name} ${learner.last_name}`,
          admissionNumber: learner.admission_number,
          className: learner.group_id ? groupMap.get(learner.group_id) ?? null : null,
          relationship: link.relationship,
        };
      })
      .filter(Boolean);

    return {
      id: parent.id,
      fullName: parent.full_name,
      email: parent.email,
      phone: parent.phone,
      accessCode: parent.access_code,
      accessCodeActive: parent.access_code_active,
      accessCodeRegeneratedAt: parent.access_code_regenerated_at,
      createdAt: parent.created_at,
      children,
    };
  });

  if (search) {
    result = result.filter((p) => {
      const haystack = [
        p.fullName,
        p.email,
        p.phone,
        ...p.children.map((c: any) => c?.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  result.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return NextResponse.json({ parents: result });
}