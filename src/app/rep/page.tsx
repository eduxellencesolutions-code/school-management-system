import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RepDashboard from '@/components/representatives/RepDashboard'
import LogoutButton from '@/components/super-admin/LogoutButton'

export default async function RepPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rep } = await supabase
    .from('representatives')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!rep) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-surface-50 p-6">
      <div className="flex justify-end max-w-4xl mx-auto mb-4">
        <LogoutButton />
      </div>
      <RepDashboard />
    </div>
  )
}