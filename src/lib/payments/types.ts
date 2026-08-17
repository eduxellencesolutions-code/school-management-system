import { BillingCycle, Currency, PaidPlan } from './pricing'

export type AccountType = 'org' | 'solo'

export interface CheckoutMetadata {
  accountType: AccountType
  accountId: string   // organization_id or user_id
  plan: PaidPlan | 'founding_500'   // Added 'founding_500' as allowed value
  cycle?: BillingCycle   // Made optional — Founding 500 has no billing cycle
  platform_key: string   // ✅ ADDED - identifies platform to central router
  expected_amount: number   // ✅ ADDED - amount central expects
  expected_currency: Currency   // ✅ ADDED - currency central expects
  referral_code?: string   // Founding 500 only
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
  reference?: string
  error?: string
}