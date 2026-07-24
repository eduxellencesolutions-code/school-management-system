import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function generateReceiptNumber() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `RCT-${new Date().getFullYear()}-${rand}`;
}

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
    return NextResponse.json({ error: 'Only admins can record payments' }, { status: 403 });
  }

  const body = await request.json();
  const { accountId, amount, method, reference, paidDate, status } = body;

  if (!accountId || amount == null || !method) {
    return NextResponse.json({ error: 'Missing accountId, amount, or method' }, { status: 400 });
  }

  const paymentStatus = status ?? 'confirmed';

  const { data: payment, error: paymentError } = await supabase
    .from('fee_payments')
    .insert({
      account_id: accountId,
      amount,
      method,
      reference: reference ?? null,
      status: paymentStatus,
      paid_date: paidDate || new Date().toISOString().split('T')[0],
      recorded_by: user.id,
    })
    .select('id')
    .single();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  // Only confirmed payments get a receipt immediately
  if (paymentStatus === 'confirmed') {
    const { error: receiptError } = await supabase
      .from('fee_receipts')
      .insert({
        payment_id: payment.id,
        receipt_number: generateReceiptNumber(),
        issued_by: user.id,
      });

    if (receiptError) {
      return NextResponse.json({ error: `Payment recorded but receipt failed: ${receiptError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, paymentId: payment.id });
}