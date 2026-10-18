import { createClient } from '@supabase/supabase-js'
import { CentreCheckoutMetadata } from './types'

export async function applySuccessfulCentreSubscription(
  metadata: CentreCheckoutMetadata, provider: 'paystack' | 'flutterwave', reference: string, amountPaid: number, currencyPaid: string,
): Promise<{ success: boolean; error?: string; needsReview?: boolean; retryable?: boolean }> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await admin.rpc('confirm_centre_payment', {
    p_provider: provider, p_gateway_reference: reference, p_quote_reference: metadata.quoteReference,
    p_org_id: metadata.organizationId, p_amount: amountPaid, p_currency: currencyPaid,
  })
  if (error) { console.error('confirm_centre_payment failed:', error.message); return { success: false, retryable: true, error: 'Could not record your payment. Please contact support before paying again.' } }
  if (data?.status === 'needs_review') {
    return { success: false, needsReview: true, error: 'Your payment was received but needs review before it can be applied. Please do not pay again; our team has been notified.' }
  }
  return { success: true }
}