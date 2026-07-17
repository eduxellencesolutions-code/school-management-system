export type BillingCycle = 'termly' | 'annual'
export type Currency = 'NGN' | 'USD'
export type PaidPlan = 'small_school' | 'standard_school' | 'premium_school'

// Amounts are in the currency's smallest whole unit for display,
// converted to kobo/cents at checkout time by each provider wrapper.
export const PRICING: Record<PaidPlan, Record<Currency, Record<BillingCycle, number>>> = {
  small_school: {
    NGN: { termly: 15000, annual: 42000 },
    USD: { termly: 15, annual: 42 },
  },
  standard_school: {
    NGN: { termly: 35000, annual: 99000 },
    USD: { termly: 35, annual: 99 },
  },
  premium_school: {
    NGN: { termly: 75000, annual: 210000 },
    USD: { termly: 75, annual: 210 },
  },
}

export function getPrice(plan: PaidPlan, currency: Currency, cycle: BillingCycle): number {
  return PRICING[plan][currency][cycle]
}

// Approximate cycle length used to compute subscription_expires_at.
// 1 term ≈ 1/3 of a school year.
export function getCycleDurationDays(cycle: BillingCycle): number {
  return cycle === 'annual' ? 365 : 122
}