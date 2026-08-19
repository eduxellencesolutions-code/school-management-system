import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: canView } = await supabase.rpc('has_platform_permission', { p_user_id: user.id, p_permission_key: 'representatives.view' })
  if (!canView) return NextResponse.json({ error: 'You do not have permission to view representatives' }, { status: 403 })

  const { data: rep, error } = await supabase.from('representatives').select('*').eq('id', id).single()
  if (error || !rep) return NextResponse.json({ error: 'Representative not found' }, { status: 404 })

  let signedPhotoUrl: string | null = null
  if (rep.photo_url) {
    const { data } = await supabase.storage.from('representative-passports').createSignedUrl(rep.photo_url, 300)
    signedPhotoUrl = data?.signedUrl ?? null
  }

  const { data: latestVersion } = await supabase
    .from('representative_agreement_versions')
    .select('id, version')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: acceptance } = latestVersion
    ? await supabase
        .from('representative_agreement_acceptances')
        .select('accepted_at, representative_agreement_versions(version)')
        .eq('representative_id', id)
        .order('accepted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null }

  const { data: referrals } = await supabase
    .from('referrals')
    .select('id, status, referred_at, qualified_at, rejection_reason, organizations(id, name)')
    .eq('representative_id', id)
    .order('referred_at', { ascending: false })

  const { data: commissions } = await supabase.from('commissions').select('id, amount, status').eq('representative_id', id)
  const { data: bankAccounts } = await supabase.from('bank_accounts').select('id, bank_name, account_number, account_name, is_verified').eq('representative_id', id)

  const { data: auditHistory } = await supabase
    .from('platform_audit_log')
    .select('id, actor_id, action, reason, metadata, created_at')
    .eq('target_type', 'representative')
    .eq('target_id', id)
    .order('created_at', { ascending: false })

  const actorIds = Array.from(new Set((auditHistory ?? []).map(a => a.actor_id).filter(Boolean)))
  const { data: actors } = actorIds.length > 0 ? await supabase.from('users').select('id, full_name').in('id', actorIds) : { data: [] }
  const actorMap = Object.fromEntries((actors ?? []).map(a => [a.id, a.full_name]))
  const auditHistoryEnriched = (auditHistory ?? []).map(a => ({ ...a, actorName: actorMap[a.actor_id] ?? 'Unknown' }))

  let lastLogin: string | null = null
  if (rep.user_id) {
    const { data: lastLoginRow } = await supabase
      .from('login_history')
      .select('created_at')
      .eq('user_id', rep.user_id)
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    lastLogin = lastLoginRow?.created_at ?? null
  }

  const pendingCommission = (commissions ?? []).filter(c => c.status === 'pending' || c.status === 'payable').reduce((s, c) => s + c.amount, 0)

  return NextResponse.json({
    representative: rep,
    signedPhotoUrl,
    agreement: {
      accepted: !!acceptance,
      acceptedAt: acceptance?.accepted_at ?? null,
      version: (acceptance as any)?.representative_agreement_versions?.version ?? null,
      latestVersion: latestVersion?.version ?? null,
    },
    referrals: referrals ?? [],
    bankAccounts: bankAccounts ?? [],
    pendingCommission,
    auditHistory: auditHistoryEnriched,
    lastLogin,
  })
}
