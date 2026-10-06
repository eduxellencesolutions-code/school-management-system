// src/app/pricing/higher-institutions/page.tsx
export const runtime = 'nodejs'
import { createClient } from '@/lib/supabase/server'
import HigherInstitutionsPricingClient from './PricingClient'

export const metadata = {
  title: 'Higher Institutions Pricing — Eduxellence Results',
  description: 'Per-student-per-term pricing for universities, polytechnics and colleges of education on Eduxellence Results.',
}

export default async function HigherInstitutionsPricingPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_public_tertiary_pricing')

  return <HigherInstitutionsPricingClient data={error ? null : data} />
}