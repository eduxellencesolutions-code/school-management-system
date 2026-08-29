import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AcademicHistory from '@/components/parents/AcademicHistory'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function ParentHistoryPage({
  params,
}: {
  params: Promise<{ learnerId: string }>
}) {
  const { learnerId } = await params
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: parentAccount } = await supabase
    .from('parent_accounts')
    .select('id')
    .eq('auth_user_id', authUser.id)
    .single()

  if (!parentAccount) redirect('/login')

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <AcademicHistory learnerId={learnerId} />
      </div>
    </div>
  )
}