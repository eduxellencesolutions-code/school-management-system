// FILE: src/app/(dashboard)/settings/setup-wizard/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react'

interface Gap { severity: 'blocking' | 'warning' | 'info'; code: string; message: string; action_href?: string }

export default function SetupWizardPage() {
  const supabase = createClient()
  const [gaps, setGaps] = useState<Gap[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      if (!profile?.organization_id) return

      const { data } = await supabase.rpc('get_tertiary_setup_gaps', { p_org_id: profile.organization_id })
      setGaps(data?.gaps ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const icons = { blocking: AlertCircle, warning: AlertTriangle, info: Info }
  const colors = {
    blocking: 'bg-red-50 border-red-200 text-red-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700',
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-1">Setup Status</h1>
      <p className="page-subtitle mb-6">What still needs attention before this session is fully ready.</p>

      {loading ? (
        <p className="text-sm text-ink-faint">Checking your setup…</p>
      ) : gaps.length === 0 ? (
        <div className="card p-6 flex items-center gap-3">
          <CheckCircle2 className="text-green-600" size={20} />
          <p className="text-sm text-ink">Everything looks set up — no gaps found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {gaps.map((gap, i) => {
            const Icon = icons[gap.severity]
            return (
              <div key={i} className={`border rounded-lg p-4 flex items-start gap-3 ${colors[gap.severity]}`}>
                <Icon size={16} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{gap.message}</p>
                  {gap.action_href && (
                    <Link href={gap.action_href} className="text-xs font-medium underline mt-1 inline-block">Fix this →</Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}