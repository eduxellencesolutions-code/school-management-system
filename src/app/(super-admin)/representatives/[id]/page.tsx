import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RepProfilePanel from '@/components/super-admin/RepProfilePanel'

export const dynamic = 'force-dynamic'

export default async function RepresentativeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canView) redirect('/dashboard')

  return (
    <div className="flex flex-col gap-6">
      <RepProfilePanel repId={id} />
    </div>
  )
}