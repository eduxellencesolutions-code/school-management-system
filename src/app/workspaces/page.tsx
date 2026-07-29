import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces } from '@/lib/workspaces/getUserWorkspaces'
import Link from 'next/link'
import { School, Handshake, ShieldCheck, Briefcase } from 'lucide-react'

const ICONS = { school: School, representative: Handshake, super_admin: ShieldCheck, staff: Briefcase }

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaces = await getUserWorkspaces(supabase, user.id)
  if (workspaces.length === 0) redirect('/dashboard')
  if (workspaces.length === 1) redirect(workspaces[0].href)

  return (
    <div className="max-w-md mx-auto mt-16 flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-ink text-center mb-2">Choose a workspace</h1>
      {workspaces.map((w) => {
        const Icon = ICONS[w.type]
        return (
          <Link
            key={w.href}
            href={w.href}
            className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors"
          >
            <Icon size={20} className="text-brand-500" />
            <span className="font-medium text-ink">{w.label}</span>
          </Link>
        )
      })}
    </div>
  )
}