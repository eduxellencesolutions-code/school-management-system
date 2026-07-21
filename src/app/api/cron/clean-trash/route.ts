import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Vercel Cron sends a secret header — verify it
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  // Find reports deleted more than 30 days ago
  const { data: reportsToDelete } = await supabase
    .from('reports')
    .select('id')
    .eq('deleted', true)
    .lt('deleted_at', thirtyDaysAgo.toISOString())

  let deletedCount = 0

  for (const report of reportsToDelete ?? []) {
    const { error } = await supabase
      .from('reports')
      .delete()
      .eq('id', report.id)

    if (!error) {
      deletedCount++
    }
  }

  console.log(`🧹 Cleaned trash: ${deletedCount} reports permanently deleted`)

  return NextResponse.json({
    success: true,
    ranAt: new Date().toISOString(),
    deletedCount,
  })
}