'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import type { User, Organization } from '@/types'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  FileText, Settings, LogOut, ChevronRight, Bell,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const NAV = [
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Classes',    href: '/classes',     icon: BookOpen },
  { label: 'Students',   href: '/students',    icon: Users },
  { label: 'Scores',     href: '/scores',      icon: ClipboardList },
  { label: 'Reports',    href: '/reports',     icon: FileText },
  { label: 'Settings',   href: '/settings',    icon: Settings },
]

interface Props {
  user: User
  org?: Organization | null
}

export default function Sidebar({ user, org }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const plan = org?.subscription_plan ?? 'free'
  const planLabel: Record<string, string> = {
    free: 'Free',
    teacher: 'Teacher',
    small_school: 'Small School',
    standard_school: 'Standard School',
    premium_school: 'Premium',
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-surface-200 bg-white h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-surface-200">
        <span className="font-bold text-sm text-ink">
          Eduxellence <span className="text-brand-500">Results</span>
        </span>
      </div>

      {/* Org info */}
      {org && (
        <div className="px-4 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
              {getInitials(org.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink truncate">{org.name}</p>
              <span className="badge badge-blue text-[10px]">{planLabel[plan]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-surface-50 hover:text-ink'
              )}
            >
              <Icon size={15} className="shrink-0" />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-brand-400" />}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-surface-200 p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
            {getInitials(user?.name ?? user?.email ?? 'User')}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{user?.name ?? user?.email ?? 'User'}</p>
            <p className="text-[10px] text-ink-faint truncate capitalize">{user?.role ?? 'teacher'}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-3 py-2 rounded text-xs font-medium text-ink-muted hover:bg-red-50 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}