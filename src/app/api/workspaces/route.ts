import { createClient } from '@/lib/supabase/server'
import { getUserWorkspaces } from '@/lib/workspaces/getUserWorkspaces'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const workspaces = await getUserWorkspaces(supabase, user.id)
  return NextResponse.json({ workspaces })
}