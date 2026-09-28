// FILE: src/app/(dashboard)/tertiary/students/activation-slips/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pdf } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import toast from 'react-hot-toast'
import { Loader2, FileDown } from 'lucide-react'
import { StudentActivationSlipsPDF } from '@/components/tertiary/StudentActivationSlipsPDF'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

interface CohortOption { id: string; name: string }

export default function ActivationSlipsPage() {
  const supabase = createClient()
  const [cohorts, setCohorts] = useState<CohortOption[]>([])
  const [groupId, setGroupId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [skipped, setSkipped] = useState<{ learner_id: string; skipped_reason: string }[]>([])

  useEffect(() => {
    async function load() {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) return
      const { data: profile } = await supabase.from('users').select('organization_id').eq('id', user.id).single()
      if (!profile?.organization_id) return

      const { data: groupData } = await supabase
        .from('groups').select('id, name')
        .eq('organization_id', profile.organization_id).eq('type', 'cohort').eq('is_active', true)
        .order('name')
      setCohorts(groupData ?? [])
      if (groupData && groupData.length > 0) setGroupId(groupData[0].id)
    }
    load()
  }, [])

  async function generateSlips() {
    if (!groupId) { toast.error('Select a cohort'); return }
    setGenerating(true)
    setSkipped([])
    try {
      // Confirm before consuming credentials — this call REVOKES any
      // prior unconsumed token for each student and cannot be undone
      // or re-fetched; it must be re-run (and re-printed) if lost.
      const { data: results, error } = await supabase.rpc('bulk_generate_activation_tokens', {
        p_group_id: groupId,
        p_expires_in_hours: 168,
      })
      if (error) throw error

      const generated = (results ?? []).filter((r: any) => r.token !== null)
      const skippedRows = (results ?? []).filter((r: any) => r.token === null)
      setSkipped(skippedRows)

      if (generated.length === 0) {
        toast.error('No students needed activation credentials (all already activated or generation failed)')
        return
      }

      const learnerIds = generated.map((r: any) => r.learner_id)
      const { data: learners } = await supabase
        .from('learners')
        .select('id, first_name, last_name, admission_number')
        .in('id', learnerIds)

      const { data: profile } = await supabase
        .from('users').select('organization_id').eq('id', (await getAuthenticatedUser(supabase)).user!.id).single()
      const { data: org } = await supabase
        .from('organizations').select('name, logo_url').eq('id', profile!.organization_id).single()

      const students = generated.map((r: any) => {
        const l = (learners ?? []).find((x: any) => x.id === r.learner_id)
        return {
          admission_number: l?.admission_number ?? '—',
          first_name: l?.first_name ?? '',
          last_name: l?.last_name ?? '',
          token: r.token,
          expires_at: r.expires_at,
        }
      })

      const portalUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''
      const doc = (
        <StudentActivationSlipsPDF
          institution={{ name: org?.name ?? '', logo_url: org?.logo_url ?? undefined }}
          portalUrl={portalUrl}
          students={students}
        />
      )
      const blob = await pdf(doc).toBlob()
      saveAs(blob, `Activation_Slips_${groupId}_${new Date().toISOString().split('T')[0]}.pdf`)

      toast.success(`Generated ${generated.length} activation slip(s)${skippedRows.length ? `, ${skippedRows.length} skipped` : ''}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate activation slips')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="page-title">Student Activation Slips</h1>
        <p className="page-subtitle">
          Generate secure, single-use activation codes for a cohort and download printable slips.
        </p>
      </div>

      <div className="card p-5 flex flex-col gap-3">
        <div>
          <label className="block text-xs font-medium text-ink mb-1">Cohort</label>
          <select value={groupId} onChange={e => setGroupId(e.target.value)} className="input">
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Generating slips revokes any previously issued, unused activation code for each student in
          this cohort. Only the newly generated codes will work. Codes are shown once and cannot be
          retrieved again — reprint by generating fresh codes if a slip is lost.
        </div>

        <button
          onClick={generateSlips}
          disabled={generating || !groupId}
          className="btn-primary btn-sm btn flex items-center gap-1.5 w-fit"
        >
          {generating ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
          Generate &amp; Download Slips
        </button>

        {skipped.length > 0 && (
          <div className="text-xs text-ink-muted">
            {skipped.length} student(s) skipped (already activated or an error occurred).
          </div>
        )}
      </div>
    </div>
  )
}