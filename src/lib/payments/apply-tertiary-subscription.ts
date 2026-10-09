import { createClient } from '@supabase/supabase-js'
import { TertiaryCheckoutMetadata } from './types'

export async function applySuccessfulTertiarySubscription(
  metadata: TertiaryCheckoutMetadata,
  provider: 'paystack' | 'flutterwave',
  reference: string,
  amountPaid: number,
  currencyPaid: string
): Promise<{ success: boolean; error?: string }> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data, error } = await admin.rpc('confirm_tertiary_payment', {
    p_provider: provider,
    p_gateway_reference: reference,
    p_quote_reference: metadata.quoteReference,
    p_org_id: metadata.organizationId,
    p_amount: amountPaid,
    p_currency: currencyPaid,
  })
  if (error) {
    console.error('confirm_tertiary_payment failed:', error.message)
    return { success: false, error: 'Could not record your payment. Please contact support before paying again.' }
  }
  if (data?.status === 'needs_review') {
    console.error('Tertiary payment needs review:', data.reason, reference)
    return { success: false, error: 'Your payment was received but needs review before it can be applied. Our team has been notified. Please do not pay again.' }
  }
  return { success: true }
}