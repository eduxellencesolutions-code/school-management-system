import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PromotionRulesForm from '@/components/promotion/PromotionRulesForm'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

export default async function PromotionRulesPage() {
  const supabase = await createClient()
  const { user: authUser } = await getAuthenticatedUser(supabase)
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', authUser.id)
    .single()

  if (!user?.organization_id) redirect('/dashboard')

  // ✅ FIX: Check permission instead of hard role check
  const { data: canConfigureRules } = await supabase.rpc('has_permission', { 
    p_user_id: authUser.id, 
    p_permission_key: 'promotion.configure_rules' 
  })
  if (user.role !== 'admin' && !canConfigureRules) redirect('/dashboard')

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