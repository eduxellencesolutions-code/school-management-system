'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn, getInitials } from '@/lib/utils'
import type { User, Organization } from '@/types'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  FileText, Settings, LogOut, ChevronRight,
  CalendarCheck, Smile, ClipboardCheck, Wallet,
  Lock, TrendingUp, Megaphone, ShieldCheck,
  TicketIcon, LineChart, Receipt, FilePlus2, CreditCard,
  Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  user: User
  org?: Organization | null
  features: string[]
  isSchoolAdmin: boolean
  permissions: string[]
}

export default function Sidebar({ user, org, features, isSchoolAdmin, permissions }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Mobile drawer state — closed by default. On desktop this is irrelevant
  // because CSS (md:translate-x-0, md:static) overrides it regardless.
  const [isOpen, setIsOpen] = useState(false)

  // Close the drawer automatically whenever the route changes, so tapping
  // a nav link on mobile doesn't leave the drawer open over the new page.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const plan = org?.subscription_plan ?? 'free'
  const isSoloTeacher = !org
  const isAdmin = user?.role === 'admin'

  const planLabel: Record<string, string> = {
    free: 'Free',
    teacher: 'Teacher',
    solo_teacher_pro: 'Solo Teacher Pro',
    small_school: 'Small School',
    standard_school: 'Standard School',
    premium_school: 'Premium',
    founding_500: 'Founding 500 Promo',
  }

  const has = (key: string) => !isSoloTeacher && features.includes(key)
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
    ...(has('basic_attendance') ? [{ label: 'Attendance', href: '/attendance', icon: CalendarCheck }] : []),
    ...(has('basic_attendance') ? [{ label: 'Attendance Reports', href: '/attendance/reports', icon: FileText }] : []),
    ...(has('affective_psychomotor') ? [{ label: 'Affective & Psychomotor', href: '/psychomotor', icon: Smile }] : []),
    ...(has('homework') ? [{ label: 'Homework', href: '/homework', icon: ClipboardCheck }] : []),
    ...(has('fees') ? [{ label: 'Fees', href: '/fees', icon: Wallet }] : []),
    ...(has('fees') && canDo('fees.manage_structures') ? [{ label: 'Fee Structures', href: '/fees/structures', icon: Receipt }] : []),
    ...(has('fees') && canDo('finance.issue_invoices') ? [{ label: 'Issue Invoices', href: '/fees/issue-invoices', icon: FilePlus2 }] : []),
    ...(has('fees') && canDo('fees.record_payment') ? [{ label: 'Record Payments', href: '/fees/payments', icon: CreditCard }] : []),
    ...(isAdmin && has('advanced_finance_analytics') ? [{ label: 'Financial Analytics', href: '/finance-analytics', icon: LineChart }] : []),
  ]

  const governanceNav = [
    ...(isAdmin || canDo('executive.view_overview') ? [{ label: 'Executive Dashboard', href: '/executive', icon: TrendingUp }] : []),
    ...(isAdmin ? [{ label: 'Lock Results', href: '/reports/lock', icon: Lock }] : []),
    ...(isAdmin ? [{ label: 'Parent Management', href: '/parents', icon: Users }] : []),
    ...(isAdmin && has('promotion_wizard') ? [{ label: 'Promotion Center', href: '/promotion', icon: TrendingUp }] : []),
    ...(isAdmin && has('promotion_wizard') ? [{ label: 'Promotion Rules', href: '/promotion/rules', icon: Settings }] : []),
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
        prefetch={false}
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
    <>
      {/* Mobile top bar with hamburger — only visible below md breakpoint.
          Adjust/remove this if your app already has its own mobile header;
          in that case just wire that header's menu button to setIsOpen(true). */}
      <div className="md:hidden w-full shrink-0 flex items-center justify-between px-4 h-12 border-b border-surface-200 bg-white sticky top-0 z-30">
        <span className="font-bold text-sm text-ink">
          Eduxellence <span className="text-brand-500">Results</span>
        </span>
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          className="p-2 -mr-2 text-ink-muted"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Backdrop — only rendered/visible on mobile when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          // Mobile: fixed off-canvas drawer, slides in/out via translate-x
          'fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop (md+): back to normal static sidebar, always visible
          'md:static md:translate-x-0 md:w-56 md:shrink-0 md:h-screen md:sticky md:top-0',
          'border-r border-surface-200'
        )}
      >
        <div className="hidden md:flex px-4 py-4 border-b border-surface-200 items-center justify-between">
          <span className="font-bold text-sm text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </span>
        </div>

        {/* Close button — only shows on mobile, inside the open drawer */}
        <div className="md:hidden flex justify-end px-3 pt-3">
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="p-2 text-ink-muted"
          >
            <X size={20} />
          </button>
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
    </>
  )
}