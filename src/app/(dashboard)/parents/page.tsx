import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ParentsTable from '@/components/parents/ParentsTable'

export default async function AdminParentsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')
  if (user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="page-title">Parent Management</h1>
        <p className="page-subtitle">View, search, and manage parent portal access for your school.</p>
      </div>
      <ParentsTable />
    </div>
  )
}
