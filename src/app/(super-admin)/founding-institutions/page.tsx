// src/app/(super-admin)/founding-institutions/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'
import FoundingInstitutionsQueue from '@/components/super-admin/FoundingInstitutionsQueue'

export const dynamic = 'force-dynamic'

export default async function FoundingInstitutionsPage() {
  const supabase = await createClient()
  const { user } = await getAuthenticatedUser(supabase)
  if (!user) redirect('/login')

  const { data: isSuper } = await supabase.rpc('is_super_admin')
  if (!isSuper) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Founding Higher Institutions</h1>
        <p className="text-sm text-ink-muted mt-1">Review, qualify, and manage founding-programme applications</p>
      </div>
      <FoundingInstitutionsQueue />
    </div>
  )
}