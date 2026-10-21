import { BillingCycle, Currency, PaidPlan } from './pricing'

export type { Currency } from './pricing'

export type AccountType = 'org' | 'solo'

export interface CheckoutMetadata {
  type: 'subscription'
  accountType: AccountType
  accountId: string   // organization_id or user_id
  plan: PaidPlan
  cycle: BillingCycle
  platform_key: string   // ✅ ADDED - identifies platform to central router
  expected_amount: number   // ✅ ADDED - amount central expects
  expected_currency: Currency   // ✅ ADDED - currency central expects
}

// Founding 500 is institution-only (organization_id is NOT NULL on
// founding500_enrollments, confirmed against the schema) — no accountType
// needed, it's always an org.
export interface FoundingCheckoutMetadata {
  type: 'founding_500'
  organizationId: string
  platform_key: string
  expected_amount: number
  expected_currency: Currency
  referral_code?: string   // Founding 500 only
}

export interface TertiaryCheckoutMetadata {
  type: 'tertiary_subscription'
  quoteKind: 'period' | 'founding_conversion'
  organizationId: string
  quoteReference: string
  tierKey?: string
  billingCycle?: 'termly' | 'annual'
  platform_key: string
  expected_amount: number
  expected_currency: Currency
}

export interface K12CheckoutMetadata {
  type: 'k12_subscription'
  organizationId: string
  quoteReference: string
  planKey: string
  billingCycle: 'termly' | 'annual'
  platform_key: string
  expected_amount: number
  expected_currency: Currency
}

export interface GatewayTestMetadata {
  type: 'gateway_test'; runReference: string; platform_key: string; expected_amount: number; expected_currency: Currency
}

export interface CentreCheckoutMetadata {
  type: 'centre_subscription'
  organizationId: string
  quoteReference: string
  planKey: string
  billingCycle: 'monthly' | 'quarterly' | 'annual'
  platform_key: string
  expected_amount: number
  expected_currency: Currency
}

export interface TopupCheckoutMetadata {
  type: 'topup_subscription'; organizationId: string; quoteReference: string; planKey: string
  platform_key: string; expected_amount: number; expected_currency: Currency
}

export type AnyCheckoutMetadata = CheckoutMetadata | FoundingCheckoutMetadata | TertiaryCheckoutMetadata | K12CheckoutMetadata | GatewayTestMetadata | CentreCheckoutMetadata | TopupCheckoutMetadata

export interface InitiateCheckoutInput {
  email: string
  name: string
  amount: number
  currency: Currency
  reference: string
  redirectUrl: string
  metadata: AnyCheckoutMetadata
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
  metadata?: AnyCheckoutMetadata
  reference?: string
  payerCountry?: string
  error?: string
}