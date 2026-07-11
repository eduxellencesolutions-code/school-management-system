import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsSidebar from '@/components/settings/SettingsSidebar'

export const dynamic = 'force-dynamic'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*, organization:organizations!users_organization_id_fkey(*)')
    .eq('id', authUser.id)
    .single()

  console.log('🔍 Settings Layout:', {
    userId: authUser.id,
    role: profile?.role,
    organization_id: profile?.organization_id,
    isInstitution: !!profile?.organization_id,
    isAdmin: profile?.role === 'admin' || profile?.role === 'school_admin',
    profileError: profileError ? {
      message: profileError.message,
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
    } : null,
  })

  const isInstitution = !!profile?.organization_id
  const isAdmin = profile?.role === 'admin' || profile?.role === 'school_admin'

  return (
    <div className="flex gap-6 max-w-7xl mx-auto px-4 py-6">
      <SettingsSidebar 
        isInstitution={isInstitution} 
        isAdmin={isAdmin} 
      />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
