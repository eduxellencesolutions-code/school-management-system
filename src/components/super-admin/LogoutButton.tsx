// src/components/admin/LogoutButton.tsx
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-ink-muted hover:text-red-600 flex items-center gap-1.5"
    >
      <LogOut size={15} /> Logout
    </button>
  )
}
