// FILE: src/app/(dashboard)/settings/domains/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const BASE = '/settings/domains'

function encodeParam(key: 'success' | 'error', message: string): string {
  return `${BASE}?${key}=${encodeURIComponent(message)}`
}

export async function addDomain(formData: FormData) {
  const supabase = await createClient()

  const hostname = String(formData.get('hostname') ?? '').trim()
  const domainType = String(formData.get('domain_type') ?? '')

  if (!hostname || (domainType !== 'eduxellence_subdomain' && domainType !== 'custom_domain')) {
    redirect(encodeParam('error', 'Please provide a valid hostname and domain type.'))
  }

  const { error } = await supabase.rpc('add_organization_domain', {
    p_hostname: hostname,
    p_domain_type: domainType,
  })

  if (error) {
    redirect(encodeParam('error', error.message))
  }

  redirect(encodeParam('success', `${hostname} added. Follow the verification instructions below.`))
}

export async function activateDomain(formData: FormData) {
  const supabase = await createClient()
  const domainId = String(formData.get('domain_id') ?? '')

  const { error } = await supabase.rpc('activate_organization_domain', {
    p_domain_id: domainId,
  })

  if (error) redirect(encodeParam('error', error.message))
  redirect(encodeParam('success', 'Domain activated.'))
}

export async function deactivateDomain(formData: FormData) {
  const supabase = await createClient()
  const domainId = String(formData.get('domain_id') ?? '')

  const { error } = await supabase.rpc('deactivate_organization_domain', {
    p_domain_id: domainId,
  })

  if (error) redirect(encodeParam('error', error.message))
  redirect(encodeParam('success', 'Domain deactivated.'))
}

export async function setPrimaryDomain(formData: FormData) {
  const supabase = await createClient()
  const domainId = String(formData.get('domain_id') ?? '')

  const { error } = await supabase.rpc('set_primary_organization_domain', {
    p_domain_id: domainId,
  })

  if (error) redirect(encodeParam('error', error.message))
  redirect(encodeParam('success', 'Primary domain updated.'))
}