import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // Create response with cleared cookies
  const response = NextResponse.json({ success: true })
  
  // Clear all auth-related cookies
  response.cookies.set('sb-access-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('sb-refresh-token', '', { maxAge: 0, path: '/' })
  response.cookies.set('supabase-auth-token', '', { maxAge: 0, path: '/' })
  
  return response
}