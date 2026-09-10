// FILE: src/app/(dashboard)/settings/institution/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setInstitutionType, setGradingScale } from './actions'
import { useSearchParams } from 'next/navigation'

export default function InstitutionSettingsPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')

  const [orgType, setOrgType] = useState<string>('school')
  const [activeScale, setActiveScale] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      if (!profile?.organization_id) return

      const { data: org } = await supabase.from('organizations').select('type').eq('id', profile.organization_id).single()
      if (org) setOrgType(org.type)

      const { data: scaleData } = await supabase.rpc('get_active_tertiary_scale', { p_org_id: profile.organization_id })
      setActiveScale(scaleData)
      setLoading(false)
    }
    load()
  }, [])

  const isTertiary = orgType === 'university'

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-1">Institution Settings</h1>
      <p className="page-subtitle mb-6">Set your institution type and, for tertiary institutions, your grading scale.</p>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"><p className="text-sm text-red-700">{decodeURIComponent(error)}</p></div>}
      {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"><p className="text-sm text-green-700">{decodeURIComponent(success)}</p></div>}

      <form action={setInstitutionType} className="card p-6 flex flex-col gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Institution type</label>
          <select name="type" defaultValue={orgType} className="input">
            <option value="school">Nursery, Primary & Secondary School</option>
            <option value="university">University / Polytechnic / College</option>
            <option value="centre">Tutorial Centre / Training Institute</option>
          </select>
        </div>
        <button type="submit" className="btn-primary btn">Save institution type</button>
      </form>

      {isTertiary && (
        <div className="card p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-ink mb-1">Current grading scale</p>
            {loading ? (
              <p className="text-xs text-ink-faint">Loading…</p>
            ) : activeScale ? (
              <p className="text-sm text-ink-muted">{activeScale.scale_type} — max {activeScale.max_point}.00</p>
            ) : (
              <p className="text-xs text-ink-faint">No grading scale configured yet.</p>
            )}
          </div>

          <form action={setGradingScale} className="flex flex-col gap-3">
            <label className="block text-sm font-medium text-ink mb-1">Select grading scale</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="4_point" defaultChecked={activeScale?.scale_type === 'tertiary_4_point'} />
                4-Point Scale (common for Polytechnics / Colleges of Education)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="5_point" defaultChecked={activeScale?.scale_type === 'tertiary_5_point'} />
                5-Point Scale
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="radio" name="scale" value="7_point" defaultChecked={activeScale?.scale_type === 'tertiary_7_point'} />
                7-Point Scale
              </label>
            </div>
            <button type="submit" className="btn-primary btn w-fit">Apply grading scale</button>
            <p className="text-xs text-ink-faint">
              Note: switching scales is blocked once results have been finalized in a session that's still open —
              close the current session first. Historical results always keep the scale that was active when they were finalized.
            </p>
          </form>
        </div>
      )}
    </div>
  )
}