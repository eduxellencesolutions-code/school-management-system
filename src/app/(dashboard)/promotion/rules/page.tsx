import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PromotionRulesForm from '@/components/promotion/PromotionRulesForm'

export default async function PromotionRulesPage() {
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
        <h1 className="page-title">Promotion Rules</h1>
        <p className="page-subtitle">
          Set the criteria used to recommend which students are promoted or repeat a class.
        </p>
      </div>
      <PromotionRulesForm />
    </div>
  )
}