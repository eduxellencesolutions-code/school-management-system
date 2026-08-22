// src/components/super-admin/RepSchoolPortfolioSection.tsx
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Building, AlertTriangle, Phone, Mail } from 'lucide-react'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-amber-100 text-amber-800',
  grace_period: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const HEALTH_STYLE: Record<string, { label: string; emoji: string; className: string }> = {
  healthy: { label: 'Healthy', emoji: '🟢', className: 'bg-green-100 text-green-800' },
  needs_attention: { label: 'Needs Attention', emoji: '🟡', className: 'bg-amber-100 text-amber-800' },
  at_risk: { label: 'At Risk', emoji: '🟠', className: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', emoji: '🔴', className: 'bg-red-100 text-red-800' },
  no_recent_contact: { label: 'No Recent Contact', emoji: '⚪', className: 'bg-gray-100 text-gray-700' },
}

export default function RepSchoolPortfolioSection({ repId }: { repId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/platform-staff/representatives/${repId}/portfolio`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }, [repId])

  if (loading) return <div className="card p-5 flex justify-center"><Loader2 className="animate-spin" size={16} /></div>
  // A 403 here means the viewer lacks 'representatives.view' / super admin —
  // fail closed and show nothing rather than a broken table.
  if (error || !data) return null

  const { schools, total_registered_schools, total_active_schools, schools_needing_attention, open_escalations } = data

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-sm text-ink mb-3">School Portfolio</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="text-center p-3 bg-surface-50 rounded">
          <p className="text-lg font-bold text-ink">{total_registered_schools}</p>
          <p className="text-xs text-ink-faint">Total Registered</p>
        </div>
        <div className="text-center p-3 bg-green-50 rounded">
          <p className="text-lg font-bold text-green-700">{total_active_schools}</p>
          <p className="text-xs text-ink-faint">Active</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded">
          <p className="text-lg font-bold text-amber-700">{schools_needing_attention}</p>
          <p className="text-xs text-ink-faint">Needing Attention</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded">
          <p className="text-lg font-bold text-red-700">{open_escalations}</p>
          <p className="text-xs text-ink-faint">Open Escalations</p>
        </div>
      </div>

      {schools.length === 0 ? (
        <p className="text-xs text-ink-faint">No schools registered through this representative yet.</p>
      ) : (
        <div className="divide-y divide-surface-100">
          {schools.map((s: any) => {
            const health = HEALTH_STYLE[s.health_status] ?? HEALTH_STYLE.no_recent_contact
            return (
              <div key={s.organization_id} className="py-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-ink-faint" />
                    <span className="font-medium text-ink text-sm">{s.name}</span>
                    {s.open_escalations > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800">
                        {s.open_escalations} open
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[s.subscription_status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {s.subscription_status}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${health.className}`}>
                      {health.emoji} {health.label}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint pl-6">
                  <span>{s.contact_person || 'No contact on file'}</span>
                  {s.contact_phone && <span className="flex items-center gap-1"><Phone size={11} /> {s.contact_phone}</span>}
                  {s.contact_email && <span className="flex items-center gap-1"><Mail size={11} /> {s.contact_email}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-faint pl-6">
                  <span>Plan: {s.subscription_plan}</span>
                  <span>Registered: {s.registered_at ? new Date(s.registered_at).toLocaleDateString('en-NG') : '—'}</span>
                  <span>Expires: {s.subscription_expires_at ? new Date(s.subscription_expires_at).toLocaleDateString('en-NG') : '—'}</span>
                  <span className={s.next_follow_up_at ? 'text-brand-600 font-medium' : ''}>
                    {s.last_contact_at
                      ? `Last contact: ${new Date(s.last_contact_at).toLocaleDateString('en-NG')}`
                      : 'No follow-up recorded'}
                    {s.next_follow_up_at && ` · Next: ${new Date(s.next_follow_up_at).toLocaleDateString('en-NG')}`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 pl-6 mt-1">
                  <Link href={`/representatives/schools/${s.organization_id}`} className="text-xs text-brand-600 hover:underline">View</Link>
                  <Link href={`/representatives/schools/${s.organization_id}?tab=followups`} className="text-xs text-brand-600 hover:underline">Follow-up History</Link>
                  <Link href={`/representatives/schools/${s.organization_id}?tab=feedback`} className="text-xs text-brand-600 hover:underline">Feedback</Link>
                  <Link href={`/representatives/schools/${s.organization_id}?tab=escalations`} className="text-xs text-brand-600 hover:underline">Escalations</Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}