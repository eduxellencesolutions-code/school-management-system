import { InitiateCheckoutInput, InitiateCheckoutResult, VerifyTransactionResult, CheckoutMetadata } from './types'

const PAYSTACK_BASE = 'https://api.paystack.co'

// Paystack expects amounts in the smallest currency unit
// (kobo for NGN, cents for USD) — i.e. multiplied by 100.
export async function initiatePaystackCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.redirectUrl,
        metadata: input.metadata,
      }),
    })

    const json = await res.json()

    if (!json.status || !json.data?.authorization_url) {
      console.error('Paystack initiate error:', json)
      return { success: false, error: json.message ?? 'Failed to initiate Paystack checkout' }
    }

    return { success: true, paymentLink: json.data.authorization_url }
  } catch (err: any) {
    console.error('Paystack initiate error:', err)
    return { success: false, error: 'Failed to initiate Paystack checkout' }
  }
}

export async function verifyPaystackTransaction(reference: string): Promise<VerifyTransactionResult> {
  try {
    const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    })
    const json = await res.json()

    if (!json.status || json.data?.status !== 'success') {
      return { success: true, status: 'failed' }
    }

    return {
      success: true,
      status: 'successful',
      amount: json.data.amount / 100,
      currency: json.data.currency,
      metadata: json.data.metadata as CheckoutMetadata,
      reference: json.data.reference,   // ✅ NEW
    }
  } catch (err: any) {
    console.error('Paystack verify error:', err)
    return { success: false, status: 'failed', error: 'Verification failed' }
  }
}