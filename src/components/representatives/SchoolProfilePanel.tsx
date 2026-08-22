// src/components/representatives/SchoolProfilePanel.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, ArrowLeft, Phone, Mail, MapPin, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STATUS_STYLE: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  trial: 'bg-amber-100 text-amber-800',
  grace_period: 'bg-amber-100 text-amber-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-700',
}

const HEALTH_OPTIONS = [
  { value: 'healthy', label: '🟢 Healthy' },
  { value: 'needs_attention', label: '🟡 Needs Attention' },
  { value: 'at_risk', label: '🟠 At Risk' },
  { value: 'critical', label: '🔴 Critical' },
]

const CONTACT_METHODS = [
  { value: 'phone', label: 'Phone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'physical_visit', label: 'Physical Visit' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
]

const ISSUE_TYPES = [
  { value: 'technical_problem', label: 'Technical' },
  { value: 'payment_problem', label: 'Payment' },
  { value: 'results_problem', label: 'Academic/Results' },
  { value: 'parent_portal_problem', label: 'Parent Portal' },
  { value: 'student_management_issue', label: 'Student Management' },
  { value: 'subscription_renewal_issue', label: 'Subscription' },
  { value: 'login_access_problem', label: 'Account Access' },
  { value: 'other', label: 'Other' },
]

const SATISFACTION_OPTIONS = [
  { value: 'very_satisfied', label: 'Very satisfied' },
  { value: 'satisfied', label: 'Satisfied' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'unsatisfied', label: 'Unsatisfied' },
  { value: 'very_unsatisfied', label: 'Very unsatisfied' },
]

const FEEDBACK_CATEGORIES = [
  { value: 'product', label: 'Product feedback' },
  { value: 'customer', label: 'Customer feedback' },
  { value: 'operational', label: 'Operational feedback' },
]

const FEEDBACK_SUBTYPES: Record<string, { value: string; label: string }[]> = {
  product: [
    { value: 'feature_requested', label: 'Feature requested' },
    { value: 'feature_difficult_to_use', label: 'Feature difficult to use' },
    { value: 'something_not_working', label: 'Something not working' },
    { value: 'training_required', label: 'Training required' },
  ],
  customer: [
    { value: 'school_satisfied', label: 'School satisfied' },
    { value: 'school_needs_support', label: 'School needs additional support' },
    { value: 'considering_cancellation', label: 'School considering cancellation' },
    { value: 'interested_upgrading', label: 'School interested in upgrading' },
  ],
  operational: [
    { value: 'payment_issue', label: 'Payment issue' },
    { value: 'login_issue', label: 'Login issue' },
    { value: 'teacher_issue', label: 'Teacher issue' },
    { value: 'parent_issue', label: 'Parent issue' },
    { value: 'student_result_issue', label: 'Student/result issue' },
  ],
}

// Derived display status — layered on top of the stored health_status enum
// rather than changing the DB enum, since most of these states are
// time-based or computed from other tables, not independent facts to store.
function getDisplayStatus(school: any, relationship: any, escalations: any[]) {
  const openIssues = (escalations ?? []).filter(e => e.status !== 'resolved' && e.status !== 'closed').length
  const isInactive = ['expired', 'suspended', 'cancelled'].includes(school.subscription_status)
  const isOnboarding = school.subscription_status === 'trial' && !relationship?.last_contact_at

  if (isInactive) return '⚫ Inactive/Expired'
  if (openIssues > 0) return '🔴 Issue Reported'
  if (isOnboarding) return '🟠 Onboarding'
  if (relationship?.follow_up_status === 'pending' &&
      relationship?.next_follow_up_at && new Date(relationship.next_follow_up_at) < new Date()) {
    return '🟡 Needs Follow-up'
  }
  return '🟢 Active'
}

export default function SchoolProfilePanel({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const [showFollowUpForm, setShowFollowUpForm] = useState(false)
  const [followUp, setFollowUp] = useState({
    contactDate: new Date().toISOString().split('T')[0],
    contactMethod: 'phone',
    reason: '', schoolReported: '', challengeIssue: '', actionTaken: '',
    followUpRequired: false, nextFollowUpDate: '', notes: '',
  })

  const [showEscalationForm, setShowEscalationForm] = useState(false)
  const [escalation, setEscalation] = useState({ issueType: 'technical_problem', title: '', description: '', priority: 'normal' })
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedback, setFeedback] = useState({ category: 'customer', subtype: '', satisfaction: 'satisfied', biggestChallenge: '', notes: '' })

  function load() {
    setLoading(true)
    fetch(`/api/representatives/schools/${organizationId}`)
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setData(d) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [organizationId])

  async function setHealth(health: string) {
    setBusy(true); setMessage(null)
    const res = await fetch(`/api/representatives/schools/${organizationId}/health`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ health }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) setMessage({ type: 'error', text: json.error })
    else { setMessage({ type: 'success', text: 'Relationship health updated' }); load() }
  }

  async function submitFollowUp() {
    if (followUp.followUpRequired && !followUp.nextFollowUpDate) {
      setMessage({ type: 'error', text: 'A next follow-up date is required when follow-up is needed' })
      return
    }
    setBusy(true); setMessage(null)
    const res = await fetch('/api/representatives/follow-ups', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, ...followUp }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) { setMessage({ type: 'error', text: json.error }); return }
    setMessage({ type: 'success', text: 'Follow-up logged' })
    setShowFollowUpForm(false)
    setFollowUp({ contactDate: new Date().toISOString().split('T')[0], contactMethod: 'phone', reason: '', schoolReported: '', challengeIssue: '', actionTaken: '', followUpRequired: false, nextFollowUpDate: '', notes: '' })
    load()
  }

  async function submitEscalation() {
    if (!escalation.title.trim() || !escalation.description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required' })
      return
    }

    let attachmentUrl: string | null = null
    if (attachmentFile) {
      setUploadingAttachment(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: rep } = await supabase.from('representatives').select('id').eq('user_id', user?.id).single()
      const path = `${rep?.id}/${Date.now()}_${attachmentFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('escalation-attachments')
        .upload(path, attachmentFile)

      setUploadingAttachment(false)

      if (uploadError) {
        setMessage({ type: 'error', text: `Attachment upload failed: ${uploadError.message}` })
        return
      }

      const { data: publicUrlData } = supabase.storage.from('escalation-attachments').getPublicUrl(path)
      attachmentUrl = publicUrlData.publicUrl
    }

    setBusy(true); setMessage(null)
    const res = await fetch('/api/representatives/escalations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, ...escalation, attachmentUrl }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) { setMessage({ type: 'error', text: json.error }); return }
    setMessage({ type: 'success', text: 'Issue reported to Super Admin' })
    setShowEscalationForm(false)
    setEscalation({ issueType: 'technical_problem', title: '', description: '', priority: 'normal' })
    setAttachmentFile(null)
    load()
  }

  async function submitFeedback() {
    if (feedback.category === 'customer' && !feedback.satisfaction) {
      setMessage({ type: 'error', text: 'Please select a satisfaction level' })
      return
    }
    setBusy(true); setMessage(null)
    const res = await fetch('/api/representatives/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        category: feedback.category,
        subtype: feedback.subtype || null,
        satisfaction: feedback.category === 'customer' ? feedback.satisfaction : null,
        biggestChallenge: feedback.biggestChallenge,
        notes: feedback.notes,
      }),
    })
    const json = await res.json()
    setBusy(false)
    if (json.error) { setMessage({ type: 'error', text: json.error }); return }
    setMessage({ type: 'success', text: 'Feedback recorded' })
    setShowFeedbackForm(false)
    setFeedback({ category: 'customer', subtype: '', satisfaction: 'satisfied', biggestChallenge: '', notes: '' })
    load()
  }

  if (loading) return <div className="flex items-center justify-center p-8"><Loader2 className="animate-spin" /></div>
  if (error) return <div className="card p-6 text-red-600 max-w-md mx-auto text-center">{error}</div>
  if (!data) return null

  const { school, referral, relationship, followUps, escalations, feedback: feedbackHistory } = data

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4">
      <Link href="/rep/schools" className="text-xs text-ink-muted flex items-center gap-1 hover:text-ink w-fit">
        <ArrowLeft size={14} /> Back to My Schools
      </Link>

      {message && (
        <div className={`text-sm px-3 py-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message.text}
        </div>
      )}

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-ink">🏫 {school.name}</h1>
          <span className="text-sm font-medium">{getDisplayStatus(school, relationship, escalations)}</span>
        </div>
        <div className="flex gap-2 mb-3">
          {(school.contact_phone ?? school.phone) && (
            <a href={`tel:${school.contact_phone ?? school.phone}`} className="btn-sm btn bg-surface-100 text-ink flex items-center gap-1">📞 Call</a>
          )}
          {(school.contact_phone ?? school.phone) && (
            <a href={`https://wa.me/${(school.contact_phone ?? school.phone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-sm btn bg-green-50 text-green-700 flex items-center gap-1">💬 WhatsApp</a>
          )}
          {(school.contact_email ?? school.email) && (
            <a href={`mailto:${school.contact_email ?? school.email}`} className="btn-sm btn bg-surface-100 text-ink flex items-center gap-1">✉️ Email</a>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-faint">School Type</dt><dd className="text-ink capitalize">{school.type}</dd>
          <dt className="text-ink-faint">Students</dt><dd className="text-ink">{data.studentCount}</dd>
          <dt className="text-ink-faint">Plan</dt><dd className="text-ink">{school.subscription_plan}</dd>
          <dt className="text-ink-faint">Joined</dt><dd className="text-ink">{referral?.qualified_at ? new Date(referral.qualified_at).toLocaleDateString('en-NG') : '—'}</dd>
          <dt className="text-ink-faint">Expires</dt><dd className="text-ink">{school.subscription_expires_at ? new Date(school.subscription_expires_at).toLocaleDateString('en-NG') : '—'}</dd>
          <dt className="text-ink-faint">Referral Code</dt><dd className="text-ink font-mono text-xs">{referral?.referral_code ?? '—'}</dd>
        </dl>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Contact</h2>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2"><MapPin size={14} className="text-ink-faint" /> {school.address ?? '—'}</div>
          <div className="flex items-center gap-2"><Phone size={14} className="text-ink-faint" /> {school.contact_phone ?? school.phone ?? '—'}</div>
          <div className="flex items-center gap-2"><Mail size={14} className="text-ink-faint" /> {school.contact_email ?? school.email ?? '—'}</div>
          <div className="text-ink-muted text-xs mt-1">{school.principal_title ?? 'Principal'}: {school.principal_name ?? '—'}</div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm text-ink mb-3">Relationship Health</h2>
        <p className="text-xs text-ink-faint mb-3">
          Last contact: {relationship?.last_contact_at ? new Date(relationship.last_contact_at).toLocaleDateString('en-NG') : 'None yet'}
          {' · '}Next follow-up: {relationship?.next_follow_up_at ? new Date(relationship.next_follow_up_at).toLocaleDateString('en-NG') : 'None scheduled'}
        </p>
        <div className="flex flex-wrap gap-2">
          {HEALTH_OPTIONS.map(h => (
            <button
              key={h.value}
              disabled={busy}
              onClick={() => setHealth(h.value)}
              className={`text-xs px-3 py-1.5 rounded-full border ${relationship?.health_status === h.value ? 'bg-ink text-white border-ink' : 'border-surface-200 text-ink-muted hover:bg-surface-50'}`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-ink">Follow-up History</h2>
          <button onClick={() => setShowFollowUpForm(v => !v)} className="btn-primary btn-sm btn">Log Follow-up</button>
        </div>

        {showFollowUpForm && (
          <div className="flex flex-col gap-2 mb-4 p-3 bg-surface-50 rounded">
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="input" value={followUp.contactDate} onChange={e => setFollowUp({ ...followUp, contactDate: e.target.value })} />
              <select className="input" value={followUp.contactMethod} onChange={e => setFollowUp({ ...followUp, contactMethod: e.target.value })}>
                {CONTACT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <input className="input" placeholder="Reason for contact" value={followUp.reason} onChange={e => setFollowUp({ ...followUp, reason: e.target.value })} />
            <textarea className="input" placeholder="What the school reported" value={followUp.schoolReported} onChange={e => setFollowUp({ ...followUp, schoolReported: e.target.value })} />
            <textarea className="input" placeholder="Challenge / issue" value={followUp.challengeIssue} onChange={e => setFollowUp({ ...followUp, challengeIssue: e.target.value })} />
            <textarea className="input" placeholder="Action taken" value={followUp.actionTaken} onChange={e => setFollowUp({ ...followUp, actionTaken: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={followUp.followUpRequired} onChange={e => setFollowUp({ ...followUp, followUpRequired: e.target.checked })} />
              Follow-up required?
            </label>
            {followUp.followUpRequired && (
              <input type="date" className="input" value={followUp.nextFollowUpDate} onChange={e => setFollowUp({ ...followUp, nextFollowUpDate: e.target.value })} />
            )}
            <textarea className="input" placeholder="Notes" value={followUp.notes} onChange={e => setFollowUp({ ...followUp, notes: e.target.value })} />
            <button disabled={busy} onClick={submitFollowUp} className="btn-primary btn-sm btn self-start flex items-center gap-1.5">
              {busy && <Loader2 size={14} className="animate-spin" />} Save Follow-up
            </button>
          </div>
        )}

        <div className="divide-y divide-surface-100">
          {followUps.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No follow-ups logged yet.</p>
          ) : followUps.map((f: any) => (
            <div key={f.id} className="py-3 text-sm">
              <p className="font-medium text-ink">{new Date(f.contact_date).toLocaleDateString('en-NG')} — {f.contact_method.replace('_', ' ')}</p>
              {f.school_reported && <p className="text-ink-muted mt-1">School reported: {f.school_reported}</p>}
              {f.action_taken && <p className="text-ink-muted">Action taken: {f.action_taken}</p>}
              {f.follow_up_required && f.next_follow_up_date && (
                <p className="text-xs text-brand-600 mt-1">Next follow-up: {new Date(f.next_follow_up_date).toLocaleDateString('en-NG')}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-ink flex items-center gap-1.5"><AlertTriangle size={14} className="text-amber-500" /> Escalations</h2>
          <button onClick={() => setShowEscalationForm(v => !v)} className="btn-sm btn bg-red-50 text-red-600">🚨 Report a School Issue</button>
        </div>

        {showEscalationForm && (
          <div className="flex flex-col gap-2 mb-4 p-3 bg-surface-50 rounded">
            <select className="input" value={escalation.issueType} onChange={e => setEscalation({ ...escalation, issueType: e.target.value })}>
              {ISSUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="input" placeholder="Issue title" value={escalation.title} onChange={e => setEscalation({ ...escalation, title: e.target.value })} />
            <textarea className="input" placeholder="Description" value={escalation.description} onChange={e => setEscalation({ ...escalation, description: e.target.value })} />
            <div>
              <label className="text-xs text-ink-muted block mb-1">Attachment (screenshot/document, optional)</label>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={e => setAttachmentFile(e.target.files?.[0] ?? null)}
                className="text-xs w-full"
              />
            </div>
            <select className="input" value={escalation.priority} onChange={e => setEscalation({ ...escalation, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button disabled={busy || uploadingAttachment} onClick={submitEscalation} className="btn-sm btn bg-red-50 text-red-600 self-start flex items-center gap-1.5">
              {(busy || uploadingAttachment) && <Loader2 size={14} className="animate-spin" />}
              {uploadingAttachment ? 'Uploading…' : 'Submit to Super Admin'}
            </button>
          </div>
        )}

        <div className="divide-y divide-surface-100">
          {escalations.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No issues reported for this school.</p>
          ) : escalations.map((t: any) => {
            const thread = (data.messages ?? []).filter((m: any) => m.ticket_id === t.id)
            return (
              <div key={t.id} className="py-3">
                <div className="flex justify-between items-center text-sm mb-1">
                  <div>
                    <p className="font-medium text-ink">{t.subject}</p>
                    <p className="text-xs text-ink-faint">{new Date(t.created_at).toLocaleDateString('en-NG')} · {t.priority}</p>
                  </div>
                  <span className={`badge text-[10px] ${t.status === 'resolved' || t.status === 'closed' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span>
                </div>
                {thread.length > 1 && (
                  <div className="pl-3 border-l-2 border-surface-200 mt-2 flex flex-col gap-1.5">
                    {thread.slice(1).map((m: any) => (
                      <p key={m.id} className="text-xs text-ink-muted">
                        <span className="text-ink-faint">{new Date(m.created_at).toLocaleDateString('en-NG')}:</span> {m.body}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm text-ink">School Feedback</h2>
          <button onClick={() => setShowFeedbackForm(v => !v)} className="btn-sm btn bg-surface-100 text-ink">Record Feedback</button>
        </div>

        {showFeedbackForm && (
          <div className="flex flex-col gap-2 mb-4 p-3 bg-surface-50 rounded">
            <select
              className="input"
              value={feedback.category}
              onChange={e => setFeedback({ ...feedback, category: e.target.value, subtype: '' })}
            >
              {FEEDBACK_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>

            <select className="input" value={feedback.subtype} onChange={e => setFeedback({ ...feedback, subtype: e.target.value })}>
              <option value="">Select specific reason…</option>
              {FEEDBACK_SUBTYPES[feedback.category].map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>

            {feedback.category === 'customer' && (
              <select className="input" value={feedback.satisfaction} onChange={e => setFeedback({ ...feedback, satisfaction: e.target.value })}>
                {SATISFACTION_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}

            <textarea className="input" placeholder="Biggest challenge?" value={feedback.biggestChallenge} onChange={e => setFeedback({ ...feedback, biggestChallenge: e.target.value })} />
            <textarea className="input" placeholder="Notes" value={feedback.notes} onChange={e => setFeedback({ ...feedback, notes: e.target.value })} />
            <button disabled={busy} onClick={submitFeedback} className="btn-primary btn-sm btn self-start flex items-center gap-1.5">
              {busy && <Loader2 size={14} className="animate-spin" />} Save Feedback
            </button>
          </div>
        )}

        <div className="divide-y divide-surface-100">
          {feedbackHistory.length === 0 ? (
            <p className="p-4 text-sm text-ink-muted text-center">No feedback recorded yet.</p>
          ) : feedbackHistory.map((f: any) => (
            <div key={f.id} className="py-2 text-sm">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-100 text-ink-muted mr-2">{f.category}</span>
              <span className="font-medium text-ink">{(f.subtype ?? f.satisfaction ?? '').replace(/_/g, ' ')}</span>
              {f.biggest_challenge && <p className="text-ink-muted text-xs mt-0.5">{f.biggest_challenge}</p>}
              <p className="text-xs text-ink-faint">{new Date(f.created_at).toLocaleDateString('en-NG')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}