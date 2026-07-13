export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import Flutterwave from 'flutterwave-node-v3';
import { createClient } from '@supabase/supabase-js';

const flw = new Flutterwave(
  process.env.FLW_PUBLIC_KEY!,
  process.env.FLW_SECRET_KEY!
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLANS: Record<string, { durationDays: number }> = {
  teacher_term: { durationDays: 90 },
  small_school_year: { durationDays: 365 },
  standard_school_year: { durationDays: 365 },
  premium_school_year: { durationDays: 365 },
};

export async function POST(req: NextRequest) {
  const signature = req.headers.get('verif-hash');
  if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
    console.error('Invalid webhook signature');
    return new NextResponse(null, { status: 401 });
  }

  const event = await req.json();

  if (event.event === 'charge.completed' && event.data.status === 'successful') {
    try {
      const verification = await flw.Transaction.verify({ id: event.data.id });

      if (
        verification.data.status === 'successful' &&
        verification.data.amount >= event.data.amount &&
        verification.data.currency === 'NGN'
      ) {
        const { userId, planKey } = verification.data.meta;
        const plan = PLANS[planKey];

        if (!plan) {
          console.error('Unknown plan:', planKey);
          return new NextResponse(null, { status: 200 });
        }

        const expiresAt = new Date(Date.now() + plan.durationDays * 86400000);

        // Check if subscription exists
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('subscriptions')
            .update({
              plan_key: planKey,
              status: 'active',
              amount: verification.data.amount,
              paid_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              tx_ref: verification.data.tx_ref,
            })
            .eq('user_id', userId);
        } else {
          await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              plan_key: planKey,
              status: 'active',
              amount: verification.data.amount,
              paid_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              tx_ref: verification.data.tx_ref,
            });
        }

        // Update organization subscription
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

        console.log('✅ Subscription updated for user:', userId, 'Plan:', planKey);
      }
    } catch (error) {
      console.error('Webhook error:', error);
    }
  }

  return new NextResponse(null, { status: 200 });
}
