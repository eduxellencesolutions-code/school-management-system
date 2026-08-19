import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { approve, reason } = await request.json()
  if (typeof approve !== 'boolean') return NextResponse.json({ error: 'approve (boolean) is required' }, { status: 400 })

  const { error } = await supabase.rpc('review_representative_passport', {
    p_rep_id: id, p_approve: approve, p_reason: reason ?? null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })

  // Notify the representative of the outcome. Best-effort: a failure here
  // should not turn an otherwise-successful review into an error response.
  const { data: rep } = await supabase.from('representatives').select('user_id').eq('id', id).maybeSingle()
  if (rep?.user_id) {
    const { createClient: createServiceClient } = await import('@supabase/supabase-js')
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    await admin.from('notifications').insert({
      user_id: rep.user_id,
      organization_id: null,
      title: approve ? 'Passport photo approved' : 'Passport photo declined',
      body: approve
        ? 'Your passport photo has been approved. Your Representative account is now fully verified.'
        : `Your passport photo was declined${reason ? `: ${reason}` : '.'} Please upload a new photo.`,
      is_read: false,
      metadata: { type: 'photo_reviewed', link: approve ? '/rep' : '/rep/onboarding' },
    })
  }

  return NextResponse.json({ success: true })
}
