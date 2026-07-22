import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentDashboard from '@/components/parents/ParentDashboard'

export default async function ParentDashboardPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id, full_name')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!parentAccount) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="page-title">Welcome, {parentAccount.full_name}</h1>
          <p className="page-subtitle">Here's how your children are doing this term.</p>
        </div>
        <ParentDashboard />
      </div>
    </div>
  )
}