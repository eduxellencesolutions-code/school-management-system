import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getStaffAccess, hasPermission } from '@/lib/auth/getStaffAccess'
import Link from 'next/link'
import { LayoutDashboard, Building, Users, UsersRound, Ticket, DollarSign, Handshake, ShieldAlert, BarChart3, Megaphone } from 'lucide-react'
import LogoutButton from '@/components/super-admin/LogoutButton'
import GlobalSearch from '@/components/super-admin/GlobalSearch'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const access = await getStaffAccess(supabase, user.id)
  if (!access.isSuperAdmin && !access.isStaff) redirect('/dashboard')

  const navLinks = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard, show: access.isSuperAdmin },
    { href: '/schools', label: 'Schools', icon: Building, show: access.isSuperAdmin || hasPermission(access, 'schools.view') },
    { href: '/solo-teachers', label: 'Solo Teachers', icon: Users, show: access.isSuperAdmin || hasPermission(access, 'schools.view') },
    { href: '/analytics', label: 'Analytics', icon: BarChart3, show: hasPermission(access, 'analytics.view') },
    { href: '/support', label: 'Support', icon: Ticket, show: hasPermission(access, 'support.view') },
    { href: '/commissions', label: 'Commissions', icon: DollarSign, show: hasPermission(access, 'billing.view') || hasPermission(access, 'commissions.approve') },
    { href: '/representatives', label: 'Representatives', icon: Handshake, show: hasPermission(access, 'representatives.view') },
    { href: '/audit', label: 'Audit Log', icon: ShieldAlert, show: hasPermission(access, 'security.audit') },
    { href: '/announcements', label: 'Announcements', icon: Megaphone, show: hasPermission(access, 'announcements.manage') || access.isSuperAdmin },
    { href: '/team', label: 'Team', icon: UsersRound, show: access.isSuperAdmin },
  ].filter(l => l.show)

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-sm text-ink">Eduxellence <span className="text-red-600">Admin</span></span>
        <nav className="flex items-center gap-4">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
              <Icon size={15} /> {label}
            </Link>
          ))}
          <LogoutButton />
          <GlobalSearch />
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}