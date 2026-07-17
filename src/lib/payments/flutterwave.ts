// @ts-expect-error - flutterwave-node-v3 has no type declarations
import Flutterwave from 'flutterwave-node-v3'
import { InitiateCheckoutInput, InitiateCheckoutResult, VerifyTransactionResult, CheckoutMetadata } from './types'

const flw = new Flutterwave(process.env.FLW_PUBLIC_KEY!, process.env.FLW_SECRET_KEY!)

export async function initiateFlutterwaveCheckout(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  try {
    const response = await flw.Payment.initiate({
      tx_ref: input.reference,
      amount: input.amount,
      currency: input.currency,
      redirect_url: input.redirectUrl,
      customer: { email: input.email, name: input.name },
      customizations: { title: 'Eduxellence', description: `${input.metadata.plan} (${input.metadata.cycle})` },
      meta: input.metadata,
    })

    if (response.status !== 'success' || !response.data?.link) {
      return { success: false, error: 'Failed to initiate Flutterwave checkout' }
    }

    return { success: true, paymentLink: response.data.link }
  } catch (err: any) {
    console.error('Flutterwave initiate error:', err)
    return { success: false, error: 'Failed to initiate Flutterwave checkout' }
  }
}

export async function verifyFlutterwaveTransaction(transactionId: string): Promise<VerifyTransactionResult> {
  try {
    const verification = await flw.Transaction.verify({ id: transactionId })

    if (verification.data?.status !== 'successful') {
      return { success: true, status: 'failed' }
    }

    return {
      success: true,
      status: 'successful',
      amount: verification.data.amount,
      currency: verification.data.currency,
      metadata: verification.data.meta as CheckoutMetadata,
    }
  } catch (err: any) {
    console.error('Flutterwave verify error:', err)
    return { success: false, status: 'failed', error: 'Verification failed' }
  }
}