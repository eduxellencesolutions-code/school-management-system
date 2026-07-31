import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserWorkspaces, Workspace } from '@/lib/workspaces/getUserWorkspaces'
import Link from 'next/link'
import { School, Handshake, ShieldCheck, GraduationCap } from 'lucide-react'

const ICONS: Record<Workspace['type'], typeof School> = {
  school: School,
  solo_teacher: GraduationCap,
  representative: Handshake,
  super_admin: ShieldCheck,
  staff: ShieldCheck,
}

const ICON_STYLES: Record<Workspace['type'], string> = {
  school: 'text-brand-500 bg-brand-50',
  solo_teacher: 'text-purple-600 bg-purple-50',
  representative: 'text-amber-600 bg-amber-50',
  super_admin: 'text-red-600 bg-red-50',
  staff: 'text-red-600 bg-red-50',
}

export default async function WorkspacesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const workspaces = await getUserWorkspaces(supabase, user.id)
  if (workspaces.length === 0) redirect('/dashboard')
  if (workspaces.length === 1) redirect(workspaces[0].href)

  return (
    <div className="max-w-md mx-auto mt-16 flex flex-col gap-4">
      <div className="text-center mb-2">
        <h1 className="text-lg font-semibold text-ink">Choose a workspace</h1>
        <p className="text-sm text-ink-muted mt-1">
          Your account has access to more than one area
        </p>
      </div>
      {workspaces.map((w) => {
        const Icon = ICONS[w.type]
        return (
          <Link
            key={w.href + w.type}
            href={w.href}
            className="card p-4 flex items-center gap-3 hover:border-brand-300 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${ICON_STYLES[w.type]}`}>
              <Icon size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-ink">{w.label}</span>
              <span className="text-xs text-ink-muted">{w.sublabel}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}