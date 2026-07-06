'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, Building, Users, BookOpen, FileText, 
  CreditCard, LogOut, Bell, Shield, Palette,
  PenTool, Image, School
} from 'lucide-react'

interface Props {
  isInstitution: boolean
  isAdmin: boolean
}

export default function SettingsSidebar({ isInstitution, isAdmin }: Props) {
  const pathname = usePathname()

  const items = [
    { label: 'Profile', href: '/settings', icon: User },
    { label: 'Account', href: '/settings/account', icon: Shield },
    { label: 'Notifications', href: '/settings/notifications', icon: Bell },
    ...(isInstitution && isAdmin ? [
      { label: 'Institution', href: '/settings/institution', icon: Building },
      { label: 'Teachers', href: '/settings/teachers', icon: Users },
      { label: 'Templates', href: '/settings/templates', icon: FileText },
      { label: 'Subjects', href: '/settings/subjects', icon: BookOpen },
      // ✅ Billing points to settings page with anchor
      { label: 'Billing', href: '/settings#billing', icon: CreditCard },
    ] : []),
    { label: 'Logout', href: '/logout', icon: LogOut },
  ]

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
        </nav>
      </div>
    </div>
  )
}
