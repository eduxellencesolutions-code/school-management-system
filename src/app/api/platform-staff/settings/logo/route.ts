import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase.from('platform_settings').select('value').eq('key', 'company_logo').maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logo: data?.value ?? null })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) return NextResponse.json({ error: 'Only super admins can update the company logo' }, { status: 403 })

  const { path } = await request.json()
  if (!path || typeof path !== 'string') {
    return NextResponse.json({ error: 'path is required' }, { status: 400 })
  }

  const { data: publicUrlData } = supabase.storage.from('logos').getPublicUrl(path)

  const { error } = await supabase
    .from('platform_settings')
    .upsert(
      { key: 'company_logo', value: { path, url: publicUrlData.publicUrl, uploaded_at: new Date().toISOString() }, updated_by: user.id },
      { onConflict: 'key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, url: publicUrlData.publicUrl })
}
