import { createClient } from '@/lib/supabase/server';
import { createAdminClient, generateAccessCode } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await request.json();
  const { learnerId, parentFullName, parentEmail, parentPhone } = body;

  if (!learnerId || !parentFullName || (!parentEmail && !parentPhone)) {
    return NextResponse.json(
      { error: 'learnerId, parentFullName, and at least one of parentEmail/parentPhone are required' },
      { status: 400 }
    );
  }

  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .select('organization_id')
    .eq('id', learnerId)
    .single();

  if (learnerError || !learner) {
    return NextResponse.json({ error: 'Learner not found' }, { status: 404 });
  }

  const isSolo = learner.organization_id === null;

  if (!isSolo) {
    const { data: hasFeature, error: featureError } = await supabase
      .rpc('org_has_feature', {
        p_org_id: learner.organization_id,
        p_feature_key: 'parent_portal',
      });

    if (featureError) {
      return NextResponse.json({ error: 'Could not verify plan entitlement' }, { status: 500 });
    }

    if (!hasFeature) {
      return NextResponse.json(
        { error: 'Parent portal is not available on your current plan' },
        { status: 403 }
      );
    }
  }

  const { data: parentId, error: linkError } = await supabase
    .rpc('link_or_create_parent', {
      p_full_name: parentFullName,
      p_email: parentEmail ?? null,
      p_phone: parentPhone ?? null,
      p_learner_id: learnerId,
    });

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  // Use the admin client here — RLS on parent_accounts only lets a parent read their
  // own row, but this is a legitimate system operation run by staff/admission flow.
  const admin = createAdminClient();

  const { data: existingParent, error: existingParentError } = await admin
    .from('parent_accounts')
    .select('auth_user_id, access_code')
    .eq('id', parentId)
    .single();

  if (existingParentError || !existingParent) {
    return NextResponse.json(
      { error: `Parent linked, but could not verify authentication setup: ${existingParentError?.message}` },
      { status: 500 }
    );
  }

  if (!existingParent.auth_user_id || !existingParent.access_code) {
    let authUserId = existingParent.auth_user_id;

    if (!authUserId) {
      const ghostEmail = `parent-${parentId}@parents.eduxellence.internal`;
      const { data: newAuthUser, error: createUserError } = await admin.auth.admin.createUser({
        email: ghostEmail,
        email_confirm: true,
        user_metadata: { is_parent_account: true, parent_account_id: parentId },
      });

      if (createUserError || !newAuthUser?.user) {
        return NextResponse.json(
          { error: `Parent linked, but failed to create parent authentication identity: ${createUserError?.message}` },
          { status: 500 }
        );
      }

      authUserId = newAuthUser.user.id;
    }

    let accessCode = existingParent.access_code;
    if (!accessCode) {
      let attempts = 0;
      while (!accessCode && attempts < 5) {
        const candidate = generateAccessCode();
        const { data: clash } = await admin
          .from('parent_accounts')
          .select('id')
          .eq('access_code', candidate)
          .maybeSingle();
        if (!clash) accessCode = candidate;
        attempts++;
      }
    }

    await admin
      .from('parent_accounts')
      .update({ auth_user_id: authUserId, access_code: accessCode })
      .eq('id', parentId);
  }

  return NextResponse.json({ success: true, parentId });
}
