import { VerifyTransactionResult, CheckoutMetadata } from './types'
import { applySuccessfulSubscription } from './apply-subscription'
import { applyFounding500Payment } from './apply-founding500'
import { applySuccessfulTertiarySubscription } from './apply-tertiary-subscription'
import { applySuccessfulK12Subscription } from './apply-k12-subscription'

export type ApplyResult = { success: boolean; error?: string; needsReview?: boolean; retryable?: boolean }

export async function applyVerifiedPayment(v: VerifyTransactionResult, provider: 'paystack' | 'flutterwave'): Promise<ApplyResult> {
  const m = v.metadata
  if (!m || !v.reference || v.amount === undefined) return { success: false, error: 'Payment verification incomplete' }
  const currency = v.currency ?? 'NGN'
  switch (m.type) {
    case 'founding_500': return applyFounding500Payment(m, provider, v.reference, v.amount, currency)
    case 'tertiary_subscription': return applySuccessfulTertiarySubscription(m, provider, v.reference, v.amount, currency)
    case 'k12_subscription': return applySuccessfulK12Subscription(m, provider, v.reference, v.amount, currency)
    default: return applySuccessfulSubscription(m as CheckoutMetadata, provider, v.reference, v.amount)
  }
}