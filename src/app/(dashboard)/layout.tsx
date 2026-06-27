import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  // Only redirect if truly not logged in
  if (!authUser) redirect('/login')

  // Fetch user profile — don't redirect if missing, user may be new
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  // Fetch org if linked
  const { data: org } = user?.organization_id
    ? await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single()
    : { data: null }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <Sidebar 
        user={user ?? { 
          id: authUser.id, 
          name: authUser.email ?? 'User', 
          email: authUser.email ?? '', 
          role: 'teacher', 
          organization_id: null 
        }} 
        org={org} 
      />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}