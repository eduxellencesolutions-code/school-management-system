import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { isAdminAllowed } from '@/lib/auth/isAdminAllowed'
// ✅ FIX: Changed from '@/components/admin/' to '@/components/super-admin/'
import SoloTeacherStatusActions from '@/components/super-admin/SoloTeacherStatusActions'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function SoloTeacherManagePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ✅ Use shared helper
  const allowed = await isAdminAllowed(supabase, user.id)
  if (!allowed) redirect('/dashboard')

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: teacher, error } = await admin
    .from('users')
    .select('*')
    .eq('id', id)
    .is('organization_id', null)
    .eq('is_super_admin', false)
    .single()

  if (error) console.error('Error fetching solo teacher:', error)
  if (!teacher) notFound()

  const { data: groups } = await admin
    .from('groups')
    .select('id')
    .eq('instructor_id', id)

  const statusBadge: Record<string, string> = {
    trial: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    expired: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/solo-teachers" className="text-ink-muted hover:text-ink flex items-center gap-1">
          <ArrowLeft size={13} /> Solo Teachers
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="page-title">{teacher.name}</h1>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge[teacher.subscription_status] ?? statusBadge.cancelled}`}>
              {teacher.subscription_status ?? 'cancelled'}
            </span>
          </div>
          <p className="page-subtitle">
            {teacher.email} · {groups?.length ?? 0} classes · Plan: {teacher.subscription_plan ?? 'free'}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink mb-4">Subscription & Status</h2>
        <SoloTeacherStatusActions
          userId={teacher.id}
          currentStatus={teacher.subscription_status ?? 'cancelled'}
          currentExpiry={teacher.subscription_expires_at}
          currentPlan={teacher.subscription_plan ?? 'free'}
        />
      </div>

      <div className="card p-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-ink-faint text-xs uppercase font-semibold mb-1">Signed up</p>
          <p className="text-ink">{new Date(teacher.created_at).toLocaleDateString('en-NG')}</p>
        </div>
        <div>
          <p className="text-ink-faint text-xs uppercase font-semibold mb-1">Last login</p>
          <p className="text-ink">{teacher.last_login ? new Date(teacher.last_login).toLocaleDateString('en-NG') : '—'}</p>
        </div>
        <div>
          <p className="text-ink-faint text-xs uppercase font-semibold mb-1">Subscription start</p>
          <p className="text-ink">{teacher.subscription_start ? new Date(teacher.subscription_start).toLocaleDateString('en-NG') : '—'}</p>
        </div>
        <div>
          <p className="text-ink-faint text-xs uppercase font-semibold mb-1">Expires</p>
          <p className="text-ink">{teacher.subscription_expires_at ? new Date(teacher.subscription_expires_at).toLocaleDateString('en-NG') : '—'}</p>
        </div>
      </div>
    </div>
  )
}