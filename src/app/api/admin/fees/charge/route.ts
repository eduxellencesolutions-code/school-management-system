import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();

  if (!userRow?.organization_id || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can add charges' }, { status: 403 });
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