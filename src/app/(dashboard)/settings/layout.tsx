import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsSidebar from '@/components/settings/SettingsSidebar'

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*, organization:organizations(*)')
    .eq('id', authUser.id)
    .single()

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
