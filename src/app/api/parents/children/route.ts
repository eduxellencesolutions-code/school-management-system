import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/parents/children — list all learners linked to the logged-in parent
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Step 1: Get parent account
  const { data: parentAccount, error: parentError } = await supabase
    .from('parent_accounts')
    .select('id, full_name')
    .eq('auth_user_id', user.id)
    .single();

  if (parentError || !parentAccount) {
    return NextResponse.json({ error: 'No parent account found for this user' }, { status: 404 });
  }

  // Step 2: Get linked learner IDs (avoid nested join ambiguity)
  const { data: links, error: linksError } = await supabase
    .from('parent_learner_links')
    .select('learner_id, relationship')
    .eq('parent_id', parentAccount.id);

  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  if (!links || links.length === 0) {
    return NextResponse.json({ parent: parentAccount, children: [] });
  }

  // Step 3: Fetch learner details separately — avoids nested-join FK ambiguity
  const learnerIds = links.map((l) => l.learner_id);
  const { data: learners, error: learnersError } = await supabase
    .from('learners')
    .select('id, group_id, organization_id, first_name, last_name')
    .in('id', learnerIds);

  if (learnersError) {
    return NextResponse.json({ error: learnersError.message }, { status: 500 });
  }

  // Step 4: Combine relationship data with learner details
  const childrenWithRelationships = links.map((link) => {
    const learner = learners?.find((l) => l.id === link.learner_id);
    return {
      ...learner,
      relationship: link.relationship,
    };
  });

  return NextResponse.json({ 
    parent: parentAccount, 
    children: childrenWithRelationships 
  });
}
