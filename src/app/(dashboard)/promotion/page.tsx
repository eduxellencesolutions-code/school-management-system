import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PromotionCenter from '@/components/promotion/PromotionCenter'
import NeedHelp from '@/components/support/NeedHelp'

export default async function PromotionPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect('/login')

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const orgId = user?.organization_id

  // Promotion is never available to solo teachers
  if (!orgId) redirect('/dashboard')

  // ✅ FIX: Check permission instead of hard role check
  const { data: canViewPromotion } = await supabase.rpc('has_permission', { 
    p_user_id: authUser.id, 
    p_permission_key: 'promotion.view' 
  })
  if (user?.role !== 'admin' && !canViewPromotion) redirect('/dashboard')

  const { data: org } = await supabase
    .from('organizations')
    .select('current_term_id')
    .eq('id', orgId)
    .single()

  let termId: string | null = null
  let sessionId: string | null = null
  let termLabel: string | null = null

  if (org?.current_term_id) {
    const { data: term } = await supabase
      .from('terms')
      .select('id, name, session_id, session:academic_sessions(name)')
      .eq('id', org.current_term_id)
      .single()

    if (term) {
      termId = term.id
      sessionId = term.session_id
      const sessionName = (term.session as unknown as { name: string } | null)?.name ?? ''
      termLabel = `${sessionName} — ${term.name}`
    }
  }

  const { data: classes } = await supabase
    .from('groups')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('type', 'class')
    .eq('is_active', true)
    .order('name')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="page-title">Promotion Center</h1>
          <NeedHelp text="Review and confirm student promotions." />
        </div>
        <p className="page-subtitle">
          {termLabel ? `Reviewing promotion for ${termLabel}` : 'Review and confirm student promotions.'}
        </p>
      </div>

      {!termId || !sessionId ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No current academic term is set. Please set your current term in Settings first.
        </div>
      ) : !classes || classes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-muted">
          No classes found.
        </div>
      ) : (
        <PromotionCenter classes={classes} sessionId={sessionId} termId={termId} />
      )}
    </div>
  )
}