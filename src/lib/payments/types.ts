import { BillingCycle, Currency, PaidPlan } from './pricing'

export type AccountType = 'org' | 'solo'

export interface CheckoutMetadata {
  accountType: AccountType
  accountId: string   // organization_id or user_id
  plan: PaidPlan
  cycle: BillingCycle
}

export interface InitiateCheckoutInput {
  email: string
  name: string
  amount: number
  currency: Currency
  reference: string
  redirectUrl: string
  metadata: CheckoutMetadata
}

export interface InitiateCheckoutResult {
  success: boolean
  paymentLink?: string
  error?: string
}

export interface VerifyTransactionResult {
  success: boolean
  status: 'successful' | 'failed' | 'pending'
  amount?: number
  currency?: Currency
  metadata?: CheckoutMetadata
  reference?: string   // ✅ NEW — the provider's own canonical reference, straight from their verify API response
  error?: string
}