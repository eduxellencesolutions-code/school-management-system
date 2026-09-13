import { supabase } from '../client'

export interface SchoolProfile {
  name: string
  motto: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  establishedYear: number | null
  principalName: string | null
  principalTitle: string | null
  logoUrl: string | null
  subscriptionPlan: string | null
  subscriptionStatus: string | null
}

export async function loadSchoolProfile(orgId: string): Promise<SchoolProfile> {
  const { data, error } = await supabase
    .from('organizations')
    .select('name, motto, address, phone, email, website, established_year, principal_name, principal_title, logo_url, subscription_plan, subscription_status')
    .eq('id', orgId)
    .single()

  if (error || !data) throw new Error('Could not load school profile.')

  return {
    name: data.name, motto: data.motto, address: data.address, phone: data.phone,
    email: data.email, website: data.website, establishedYear: data.established_year,
    principalName: data.principal_name, principalTitle: data.principal_title,
    logoUrl: data.logo_url, subscriptionPlan: data.subscription_plan, subscriptionStatus: data.subscription_status,
  }
}