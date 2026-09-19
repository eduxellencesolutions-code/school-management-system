// FILE: src/app/(super-admin)/domains-ssl/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const BASE = '/domains-ssl'

function encodeParam(key: 'success' | 'error', message: string): string {
  return `${BASE}?${key}=${encodeURIComponent(message)}`
}

export async function markSslActive(formData: FormData) {
  const supabase = await createClient()
  const domainId = String(formData.get('domain_id') ?? '')

  // The is_super_admin() check happens INSIDE this function — this action
  // does not duplicate that check, only forwards the call.
  const { error } = await supabase.rpc('mark_domain_ssl_active_manually', {
    p_domain_id: domainId,
  })

  if (error) {
    redirect(encodeParam('error', error.message))
  }

  redirect(encodeParam('success', 'SSL marked active. The institution can now activate this domain.'))
}