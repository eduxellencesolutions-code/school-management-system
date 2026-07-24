import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HomeworkView from '@/components/parents/HomeworkView'

export default async function ParentHomeworkPage({
  params,
}: {
  params: Promise<{ learnerId: string }>
}) {
  const { learnerId } = await params
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
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
        <HomeworkView learnerId={learnerId} />
      </div>
    </div>
  )
}