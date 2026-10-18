import { createClient } from '@supabase/supabase-js'
import { VerifyTransactionResult, CheckoutMetadata } from './types'
import { applySuccessfulSubscription } from './apply-subscription'
import { applyFounding500Payment } from './apply-founding500'
import { applySuccessfulTertiarySubscription } from './apply-tertiary-subscription'
import { applySuccessfulK12Subscription } from './apply-k12-subscription'
import { applySuccessfulCentreSubscription } from './apply-centre-subscription'

export type ApplyResult = { success: boolean; error?: string; needsReview?: boolean; retryable?: boolean }

export async function applyVerifiedPayment(v: VerifyTransactionResult, provider: 'paystack' | 'flutterwave', source: 'webhook' | 'redirect' = 'redirect'): Promise<ApplyResult> {
  const m = v.metadata
  if (!m || !v.reference || v.amount === undefined) return { success: false, error: 'Payment verification incomplete' }
  const currency = v.currency ?? 'NGN'
  switch (m.type) {
    case 'founding_500': return applyFounding500Payment(m, provider, v.reference, v.amount, currency)
    case 'tertiary_subscription': return applySuccessfulTertiarySubscription(m, provider, v.reference, v.amount, currency)
    case 'k12_subscription': return applySuccessfulK12Subscription(m, provider, v.reference, v.amount, currency)
    case 'gateway_test': {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
      const { error } = await admin.rpc('record_gateway_test_result', {
        p_reference: m.runReference, p_verified_amount: v.amount, p_verified_currency: currency, p_gateway_status: v.status ?? 'unknown',
        p_payer_country: null, p_channel: null, p_from_webhook: source === 'webhook',
      })
      return error ? { success: false, retryable: true, error: error.message } : { success: true }
    }
    case 'centre_subscription': return applySuccessfulCentreSubscription(m, provider, v.reference, v.amount, currency)
    default: return applySuccessfulSubscription(m as CheckoutMetadata, provider, v.reference, v.amount, currency)
  }
}