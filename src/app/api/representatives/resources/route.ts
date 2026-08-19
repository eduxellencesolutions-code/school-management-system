import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: rep } = await supabase
    .from('representatives').select('id, level').eq('user_id', user.id).maybeSingle()
  if (!rep) return NextResponse.json({ error: 'You do not have representative access' }, { status: 403 })

  const { data: resources, error } = await supabase
    .from('representative_resources')
    .select('*, resource_categories(key, label, icon)')
    .eq('status', 'published')
    .order('is_important', { ascending: false })
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // App-layer visibility filter — see design notes on why this isn't RLS-enforced
  const visible = (resources ?? []).filter(r => {
    if (r.visibility === 'all') return true
    if (r.visibility === 'group') return r.visible_group === rep.level
    // 'campaign' and 'product' visibility are shown to everyone for now —
    // representatives don't have a campaign/product affiliation field to
    // filter against yet; treat as informational tagging only until that exists
    return true
  })

  return NextResponse.json({ resources: visible })
}