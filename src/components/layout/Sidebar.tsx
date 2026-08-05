'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import type { User, Organization } from '@/types'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  FileText, Settings, LogOut, ChevronRight,
  CalendarCheck, Smile, ClipboardCheck, Wallet,
  Lock, TrendingUp, Megaphone, ShieldCheck,
  TicketIcon, LineChart, Receipt, FilePlus2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Props {
  user: User
  org?: Organization | null
  // Real, backend-driven feature list for this org's plan (plan_features table).
  features: string[]
  // Real permission set for this user, mirroring has_permission() exactly.
  // isSchoolAdmin === true means "every permission" (matches the admin bypass
  // built into has_permission() itself), separate from the raw role check
  // below which is only used for a few legacy admin-only sections.
  isSchoolAdmin: boolean
  permissions: string[]
}

export default function Sidebar({ user, org, features, isSchoolAdmin, permissions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const plan = org?.subscription_plan ?? 'free'
  const isSoloTeacher = !org
  const isAdmin = user?.role === 'admin' // legacy role check, kept for sections not yet on the permission system

  const planLabel: Record<string, string> = {
    free: 'Free',
    teacher: 'Teacher',
    solo_teacher_pro: 'Solo Teacher Pro',
    small_school: 'Small School',
    standard_school: 'Standard School',
    premium_school: 'Premium',
  }

  const has = (key: string) => !isSoloTeacher && features.includes(key)
  // Real permission check, mirrors has_permission(): admin bypasses everything.
  const canDo = (permissionKey: string) => isSchoolAdmin || permissions.includes(permissionKey)

  const coreNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Classes', href: '/classes', icon: BookOpen },
    { label: 'Students', href: '/students', icon: Users },
    { label: 'Scores', href: '/scores', icon: ClipboardList },
    { label: 'Reports', href: '/reports', icon: FileText },
    ...(isAdmin ? [{ label: 'Announcements', href: '/announcements', icon: Megaphone }] : []),
  ]

  const studentLifeNav = [
    ...(has('attendance') ? [{ label: 'Attendance', href: '/attendance', icon: CalendarCheck }] : []),
    ...(has('affective_psychomotor') ? [{ label: 'Affective & Psychomotor', href: '/psychomotor', icon: Smile }] : []),
    ...(has('homework') ? [{ label: 'Homework', href: '/homework', icon: ClipboardCheck }] : []),
    ...(has('fees') ? [{ label: 'Fees', href: '/fees', icon: Wallet }] : []),
    // ✅ Permission-driven, not admin-only: any role granted 'fees.manage_structures'
    // (e.g. a Finance Officer role) sees this even without being a full admin.
    ...(has('fees') && canDo('fees.manage_structures') ? [{ label: 'Fee Structures', href: '/fees/structures', icon: Receipt }] : []),
    // ✅ NEW: Issue Invoices, gated on 'finance.issue_invoices'
    ...(has('fees') && canDo('finance.issue_invoices') ? [{ label: 'Issue Invoices', href: '/fees/issue-invoices', icon: FilePlus2 }] : []),
    ...(isAdmin && has('finance_analytics') ? [{ label: 'Financial Analytics', href: '/finance-analytics', icon: LineChart }] : []),
  ]

  const governanceNav = [
    ...(isAdmin ? [{ label: 'Lock Results', href: '/reports/lock', icon: Lock }] : []),
    ...(isAdmin ? [{ label: 'Parent Management', href: '/parents', icon: Users }] : []),
    ...(isAdmin && has('promotion') ? [{ label: 'Promotion Center', href: '/promotion', icon: TrendingUp }] : []),
    ...(isAdmin && has('promotion') ? [{ label: 'Promotion Rules', href: '/promotion/rules', icon: Settings }] : []),
    ...(isAdmin ? [{ label: 'Roles & Permissions', href: '/roles', icon: ShieldCheck }] : []),
    { label: 'Support', href: '/school-support', icon: TicketIcon },
    ...(isAdmin ? [{ label: 'Representatives', href: '/representatives', icon: Users }] : []),
    ...(isAdmin ? [{ label: 'Commissions', href: '/commissions', icon: Wallet }] : []),
    ...(isAdmin ? [{ label: 'Withdrawals', href: '/withdrawals', icon: Wallet }] : []),
  ]

  const renderLink = ({ label, href, icon: Icon }: { label: string; href: string; icon: any }) => {
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
  }

  return (
    <aside className="flex flex-col w-56 shrink-0 border-r border-surface-200 bg-white h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-surface-200">
        <span className="font-bold text-sm text-ink">
          Eduxellence <span className="text-brand-500">Results</span>
        </span>
      </div>

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

      <nav className="flex-1 px-2 py-3 flex flex-col gap-3 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {coreNav.map(renderLink)}
        </div>

        {studentLifeNav.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">
              Student Life
            </p>
            {studentLifeNav.map(renderLink)}
          </div>
        )}

        {governanceNav.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-ink-faint uppercase tracking-wider">
              Academic Governance
            </p>
            {governanceNav.map(renderLink)}
          </div>
        )}

        <div className="flex flex-col gap-0.5 mt-auto">
          {renderLink({ label: 'Settings', href: '/settings', icon: Settings })}
        </div>
      </nav>

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