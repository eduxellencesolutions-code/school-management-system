import { createClient } from '@supabase/supabase-js'
import { TertiaryCheckoutMetadata } from './types'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function applySuccessfulTertiarySubscription(
  metadata: TertiaryCheckoutMetadata,
  provider: 'paystack' | 'flutterwave',
  reference: string,
  amountPaid: number,
  currencyPaid: string
): Promise<{ success: boolean; error?: string }> {
  const admin = serviceClient()

  const { error: claimError } = await admin
    .from('processed_payments')
    .insert({
      provider,
      reference,
      account_id: metadata.organizationId,
      plan: metadata.tierKey,
      amount: amountPaid,
      currency: currencyPaid,
      billing_cycle: metadata.billingCycle,
      gateway: provider,
    })

  if (claimError) {
    if (claimError.code === '23505') {
      return { success: true }
    }
    console.error('Error claiming tertiary payment reference:', claimError)
    return { success: false, error: claimError.message }
  }

  const { data: quote, error: quoteError } = await admin
    .from('tertiary_payment_quotes')
    .select('*')
    .eq('reference', metadata.quoteReference)
    .eq('organization_id', metadata.organizationId)
    .maybeSingle()

  if (quoteError || !quote) {
    console.error('No matching tertiary payment quote found for quote reference:', metadata.quoteReference, quoteError)
    return { success: false, error: 'No matching billing quote found for this payment' }
  }

  if (quote.status === 'confirmed') {
    return { success: true }
  }

  if (quote.expires_at && new Date(quote.expires_at).getTime() < Date.now()) {
    console.error(`Tertiary payment reference ${reference} matched an EXPIRED quote — refusing to confirm`)
    return { success: false, error: 'This payment quote has expired. Please initiate a new payment.' }
  }

  if (Math.round(amountPaid) !== Math.round(Number(quote.amount_due))) {
    console.error(
      `Tertiary payment amount mismatch: paid=${amountPaid} ${currencyPaid}, quoted=${quote.amount_due} ${quote.currency} (ref ${reference})`
    )
    return { success: false, error: 'Payment amount did not match the quoted amount' }
  }
  if (currencyPaid !== quote.currency) {
    console.error(
      `Tertiary payment currency mismatch: paid in ${currencyPaid}, quoted in ${quote.currency} (ref ${reference})`
    )
    return { success: false, error: 'Payment currency did not match the quoted currency' }
  }

  const { error: confirmError } = await admin
    .from('tertiary_payment_quotes')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', quote.id)

  if (confirmError) {
    console.error('Error confirming tertiary payment quote:', confirmError)
    return { success: false, error: confirmError.message }
  }

  return { success: true }
}