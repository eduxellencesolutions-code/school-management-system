import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Define available plans (same as above)
const PLANS: Record<string, { amount: number; label: string; durationDays: number }> = {
  teacher_term: { amount: 1000, label: 'Teacher (per term)', durationDays: 90 },
  small_school_year: { amount: 10000, label: 'Small School (per year)', durationDays: 365 },
  standard_school_year: { amount: 20000, label: 'Standard School (per year)', durationDays: 365 },
  premium_school_year: { amount: 50000, label: 'Premium School (per year)', durationDays: 365 },
};

export async function POST(request: NextRequest) {
  try {
    // ✅ VERIFY WEBHOOK SIGNATURE
    const signature = request.headers.get('verif-hash');
    if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the webhook payload
    const event = await request.json();
    console.log('Webhook received:', event.event);

    // Only process successful charge events
    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      console.log('Processing successful payment:', event.data.id);

      // ✅ RE-VERIFY WITH FLUTTERWAVE API (don't trust webhook alone)
      const Flutterwave = require('flutterwave-node-v3');
      const flw = new Flutterwave(
        process.env.FLW_PUBLIC_KEY,
        process.env.FLW_SECRET_KEY
      );

      const verification = await flw.Transaction.verify({ id: event.data.id });

      // Verify the transaction is truly successful
      if (
        verification.data.status === 'successful' &&
        verification.data.amount >= event.data.amount &&
        verification.data.currency === 'NGN'
      ) {
        const { userId, planKey } = verification.data.meta;
        const plan = PLANS[planKey];

        if (!plan) {
          console.error('Unknown plan:', planKey);
          return NextResponse.json({ error: 'Unknown plan' }, { status: 400 });
        }

        // Calculate expiry date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + plan.durationDays);

        // ✅ UPDATE THE USER'S SUBSCRIPTION IN THE DATABASE
        const supabase = await createClient();

        // First, check if user already has a subscription
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        let result;
        if (existing) {
          // Update existing subscription
          result = await supabase
            .from('subscriptions')
            .update({
              plan_key: planKey,
              status: 'active',
              paid_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              tx_ref: verification.data.tx_ref,
            })
            .eq('user_id', userId);
        } else {
          // Create new subscription
          result = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_key: planKey,
              status: 'active',
              paid_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              tx_ref: verification.data.tx_ref,
            });
        }

        if (result.error) {
          console.error('Database error:', result.error);
        } else {
          console.log('Subscription updated for user:', userId, 'Plan:', planKey);
        }

        // Optional: Update the organization's subscription plan
        // (if this is an institution subscription)
        const { data: profile } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (profile?.organization_id) {
          await supabase
            .from('organizations')
            .update({
              subscription_plan: planKey,
              subscription_status: 'active',
            })
            .eq('id', profile.organization_id);
        }
      }
    }

    // Always respond with 200 - Flutterwave will retry if it gets an error
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    // Still return 200 to prevent Flutterwave retries
    return NextResponse.json({ received: true });
  }
}