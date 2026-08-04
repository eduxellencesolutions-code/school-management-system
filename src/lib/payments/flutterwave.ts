import { InitiateCheckoutInput, InitiateCheckoutResult, VerifyTransactionResult, CheckoutMetadata } from './types'

const FLW_BASE = 'https://api.flutterwave.com/v3'

export async function initiateFlutterwaveCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  try {
    const response = await fetch(`${FLW_BASE}/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: input.reference,
        amount: input.amount,
        currency: input.currency,
        redirect_url: input.redirectUrl,
        customer: { email: input.email, name: input.name },
        customizations: { title: 'Eduxellence', description: `${input.metadata.plan} (${input.metadata.cycle})` },
        meta: input.metadata,
      }),
    })

    const json = await response.json()

    if (json.status !== 'success' || !json.data?.link) {
      console.error('Flutterwave initiate error:', json)
      return { success: false, error: json.message ?? 'Failed to initiate Flutterwave checkout' }
    }

    return { success: true, paymentLink: json.data.link }
  } catch (err: any) {
    console.error('Flutterwave initiate error:', err)
    return { success: false, error: 'Failed to initiate Flutterwave checkout' }
  }
}

export async function verifyFlutterwaveTransaction(transactionId: string): Promise<VerifyTransactionResult> {
  try {
    const response = await fetch(`${FLW_BASE}/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
    })
    const json = await response.json()

    if (json.status !== 'success' || json.data?.status !== 'successful') {
      return { success: true, status: 'failed' }
    }

    return {
      success: true,
      status: 'successful',
      amount: json.data.amount,
      currency: json.data.currency,
      metadata: json.data.meta as CheckoutMetadata,
      reference: String(json.data.id),   // ✅ NEW — canonical, matches what the webhook itself sees
    }
  } catch (err: any) {
    console.error('Flutterwave verify error:', err)
    return { success: false, status: 'failed', error: 'Verification failed' }
  }
}