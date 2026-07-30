'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton({ className }: { className?: string }) {
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
      className={
        className ||
        'text-sm text-ink-muted hover:text-ink flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-surface-100 transition-colors'
      }
    >
      <LogOut size={15} /> Logout
    </button>
  )
}