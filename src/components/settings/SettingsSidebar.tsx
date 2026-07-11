'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  User, Building, Users, BookOpen, FileText, 
  CreditCard, LogOut, Bell, Shield, MessageSquare
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  isInstitution: boolean
  isAdmin: boolean
}

export default function SettingsSidebar({ isInstitution, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  console.log('🔍 Sidebar Props:', { isInstitution, isAdmin })

  // ✅ Base items for ALL users
  const items = [
    { label: 'Profile', href: '/settings', icon: User },
    { label: 'Account', href: '/settings/account', icon: Shield },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell },
  ]

  // ✅ Institution-admin-ONLY features
  if (isInstitution && isAdmin) {
    items.push(
      { label: 'Institution', href: '/settings/institution', icon: Building },
      { label: 'Teachers', href: '/settings/teachers', icon: Users },
    )
  }

  // ✅ Features for BOTH solo teachers AND institution admins
  items.push(
    { label: 'Templates', href: '/settings/templates', icon: FileText },
    { label: 'Remarks', href: '/settings/remarks', icon: MessageSquare },
    { label: 'Subjects', href: '/settings/subjects', icon: BookOpen },
    { label: 'Billing', href: '/settings#billing', icon: CreditCard },
  )

  console.log('🔍 Sidebar Items:', items.map(i => i.label))

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        localStorage.clear()
        router.push('/login')
        router.refresh()
      } else {
        await supabase.auth.signOut()
        localStorage.clear()
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
      try {
        await supabase.auth.signOut()
        localStorage.clear()
        router.push('/login')
      } catch (err) {
        window.location.href = '/login'
      }
    }
  }

  return (
    <div className="w-64 flex-shrink-0">
      <div className="card p-2">
        <nav className="flex flex-col gap-0.5">
          {items.map((item) => {
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
