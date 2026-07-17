'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LogoutPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function performLogout() {
      try {
        // Clear session
        await supabase.auth.signOut()
        
        // Clear local storage
        localStorage.removeItem('supabase.auth.token')
        localStorage.removeItem('sb-access-token')
        localStorage.removeItem('sb-refresh-token')
        
        // Redirect to login
        router.push('/login')
      } catch (error) {
        console.error('Logout error:', error)
        toast.error('Failed to logout. Please try again.')
        router.push('/dashboard')
      }
    }

    performLogout()
  }, [router, supabase])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-brand-500 mx-auto mb-4" />
        <p className="text-ink-muted">Logging you out...</p>
      </div>
    </div>
  )
}
