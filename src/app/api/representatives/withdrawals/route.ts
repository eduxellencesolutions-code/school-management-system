import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { amount, bankAccountId } = body;

  if (typeof amount !== 'number' || amount <= 0 || !bankAccountId) {
    return NextResponse.json({ error: 'A positive numeric amount and bankAccountId are required' }, { status: 400 });
  }

  // The RPC function derives the representative from auth.uid() itself —
  // we never pass a representative_id from the client, by design (Step 8).
  const { data: withdrawalId, error } = await supabase.rpc('request_withdrawal', {
    p_amount: amount,
    p_bank_account_id: bankAccountId,
  });

  if (error) {
    // These are business-rule failures raised by the function itself
    // (inactive account, no bank account, insufficient balance, etc.)
    // — surface the real message rather than a generic 500.
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  return NextResponse.json({ success: true, withdrawalId });
}

export async function GET() {
  const supabase = await createClient();
  const { user } = await getAuthenticatedUser(supabase);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 });

  const { data: withdrawals, error } = await supabase
    .from('withdrawals')
    .select('id, amount_requested, amount_claimed, status, date_requested, date_paid, payment_reference, rejection_reason')
    .eq('representative_id', rep.id)
    .order('date_requested', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ withdrawals: withdrawals ?? [] });
}