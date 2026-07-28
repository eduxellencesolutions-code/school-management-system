import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, Building, Users, UsersRound } from 'lucide-react'
import LogoutButton from '@/components/super-admin/LogoutButton'

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin')
  if (!isSuperAdmin) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="border-b border-surface-200 bg-white px-6 py-3 flex items-center justify-between">
        <span className="font-bold text-sm text-ink">Eduxellence <span className="text-red-600">Admin</span></span>
        <nav className="flex items-center gap-4">
          <Link href="/overview" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
            <LayoutDashboard size={15} /> Overview
          </Link>
          <Link href="/schools" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
            <Building size={15} /> Schools
          </Link>
          <Link href="/solo-teachers" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
            <Users size={15} /> Solo Teachers
          </Link>
          <Link href="/team" className="text-sm text-ink-muted hover:text-ink flex items-center gap-1.5">
            <UsersRound size={15} /> Team
          </Link>
          <LogoutButton />
        </nav>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}