'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')
  return user
}

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const VALID_STATUSES = ['trial', 'active', 'expired', 'suspended', 'cancelled']

export async function updateSoloTeacherStatus(formData: FormData) {
  await requireSuperAdmin()
  const userId = formData.get('user_id') as string
  const status = formData.get('status') as string
  if (!userId || !status) return { success: false, message: 'Missing data' }

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, message: `Invalid status: ${status}` }
  }

  const admin = serviceClient()

  const updates: Record<string, unknown> = { subscription_status: status }

  if (status === 'suspended') {
    updates.suspended_at = new Date().toISOString()
  } else if (status === 'cancelled') {
    updates.cancelled_at = new Date().toISOString()
  } else if (status === 'active') {
    updates.suspended_at = null
    updates.cancelled_at = null
  }

  const { error } = await admin
    .from('users')
    .update(updates)
    .eq('id', userId)
    .is('organization_id', null) // safety: this action must never touch institution staff

  if (error) {
    console.error('Error updating solo teacher status:', error)
    return { success: false, message: 'Failed to update status' }
  }

  revalidatePath(`/solo-teachers/${userId}`)
  revalidatePath('/solo-teachers')
  return { success: true }
}

export async function extendSoloTeacherSubscription(formData: FormData) {
  await requireSuperAdmin()
  const userId = formData.get('user_id') as string
  const newExpiry = formData.get('expires_at') as string
  if (!userId || !newExpiry) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { error } = await admin
    .from('users')
    .update({
      subscription_expires_at: newExpiry,
      subscription_status: 'active',
      suspended_at: null,
      cancelled_at: null,
    })
    .eq('id', userId)
    .is('organization_id', null)

  if (error) {
    console.error('Error extending solo teacher subscription:', error)
    return { success: false, message: 'Failed to extend subscription' }
  }

  revalidatePath(`/solo-teachers/${userId}`)
  return { success: true }
}

export async function changeSoloTeacherPlan(formData: FormData) {
  await requireSuperAdmin()
  const userId = formData.get('user_id') as string
  const plan = formData.get('plan') as string
  if (!userId || !plan) return { success: false, message: 'Missing data' }

  const admin = serviceClient()
  const { error } = await admin
    .from('users')
    .update({ subscription_plan: plan })
    .eq('id', userId)
    .is('organization_id', null)

  if (error) {
    console.error('Error changing solo teacher plan:', error)
    return { success: false, message: 'Failed to change plan' }
  }

  revalidatePath(`/solo-teachers/${userId}`)
  return { success: true }
}
