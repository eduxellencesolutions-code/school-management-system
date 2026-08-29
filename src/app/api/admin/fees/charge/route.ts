import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request) {
  const supabase = await createClient();

  const { user } = await getAuthenticatedUser(supabase);
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  // ✅ FIX: Replace admin role check with permission check
  const { data: hasPerm } = await supabase.rpc('has_permission', { 
    p_user_id: user.id, 
    p_permission_key: 'fees.manage_structures' 
  });

  if (!userRow?.organization_id || (userRow.role !== 'admin' && !hasPerm)) {
    return NextResponse.json({ error: 'You do not have permission to add charges' }, { status: 403 });
  }

  const body = await request.json();
  const { accountId, description, amount } = body;

  if (!accountId || !description || amount == null) {
    return NextResponse.json({ error: 'Missing accountId, description, or amount' }, { status: 400 });
  }

  const { error } = await supabase
    .from('fee_charges')
    .insert({ account_id: accountId, description, amount, created_by: user.id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}