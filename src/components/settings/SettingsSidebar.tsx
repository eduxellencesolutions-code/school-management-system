'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  User, Building, Users, BookOpen, FileText, 
  CreditCard, LogOut, Bell, Shield, Palette,
  PenTool, Image, School
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface Props {
  isInstitution: boolean
  isAdmin: boolean
}

export default function SettingsSidebar({ isInstitution, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const items = [
    { label: 'Profile', href: '/settings', icon: User },
    { label: 'Account', href: '/settings/account', icon: Shield },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    ...(isInstitution && isAdmin ? [
      { label: 'Institution', href: '/settings/institution', icon: Building },
      { label: 'Teachers', href: '/settings/teachers', icon: Users },
      { label: 'Templates', href: '/settings/templates', icon: FileText },
      { label: 'Subjects', href: '/settings/subjects', icon: BookOpen },
      { label: 'Billing', href: '/settings#billing', icon: CreditCard },
    ] : []),
  ]

  const handleLogout = async () => {
    try {
      // First try the API route
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      
      if (response.ok) {
        // Clear all local storage
        localStorage.clear()
        // Navigate to login
        router.push('/login')
        router.refresh()
      } else {
        // Fallback: direct signout
        await supabase.auth.signOut()
        // Clear local storage
        localStorage.clear()
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback: direct signout
      try {
        await supabase.auth.signOut()
        localStorage.clear()
        router.push('/login')
      } catch (err) {
        // Last resort: force redirect
        window.location.href = '/login'
      }
    }
  }

  return (
    <div className="w-64 flex-shrink-0">
      <div className="card p-2">
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
            // Check if the current path matches this item's href
            const isActive = item.href === '/settings' 
              ? pathname === '/settings' 
              : pathname?.startsWith(item.href.split('#')[0] + '/') || pathname === item.href.split('#')[0]
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-ink-muted hover:bg-surface-50 hover:text-ink'
                }`}
              >
                <item.icon size={16} className={isActive ? 'text-brand-500' : 'text-ink-faint'} />
                {item.label}
              </Link>
            )
          })}
          
          {/* Logout button - always visible, separated by border */}
          <div className="border-t border-surface-200 mt-2 pt-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors text-red-600 hover:bg-red-50 w-full"
            >
              <LogOut size={16} className="text-red-500" />
              Logout
            </button>
          </div>
        </nav>
      </div>
    </div>
  )
}
