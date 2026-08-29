import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportCard from '@/components/parents/ReportCard'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function ParentReportPage({
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
      <div className="max-w-3xl mx-auto px-6 py-8">
        <ReportCard learnerId={learnerId} />
      </div>
    </div>
  )
}
