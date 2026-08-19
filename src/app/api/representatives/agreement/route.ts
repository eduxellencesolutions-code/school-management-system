import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives').select('id').eq('user_id', user.id).maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  const { data: latest } = await supabase
    .from('representative_agreement_versions')
    .select('id, version, content')
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!latest) {
    return NextResponse.json({ error: 'No representative agreement has been published yet' }, { status: 500 })
  }

  const { data: acceptance } = await supabase
    .from('representative_agreement_acceptances')
    .select('accepted_at')
    .eq('representative_id', rep.id)
    .eq('agreement_version_id', latest.id)
    .maybeSingle()

  return NextResponse.json({
    version: latest.version,
    content: latest.content,
    accepted: !!acceptance,
    acceptedAt: acceptance?.accepted_at ?? null,
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { version } = await request.json()
  if (typeof version !== 'number') return NextResponse.json({ error: 'version is required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent') ?? null

  const { error } = await supabase.rpc('accept_representative_agreement', {
    p_version: version, p_ip: ip, p_user_agent: userAgent,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 422 })
  return NextResponse.json({ success: true })
}