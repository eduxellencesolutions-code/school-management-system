// src/app/founding-institutions/apply/ApplyClient.tsx
'use client'
import { useState } from 'react'

type Campaign = {
  campaign_key: string
  name: string
  description: string | null
  benefits: { key: string; label: string; description: string; active: boolean }[]
  eligibility_criteria: { criteria?: string[]; note?: string }
  terms_and_notes: string | null
  pilot_duration_days: number | null
} | null

export default function ApplyClient({ campaign }: { campaign: Campaign }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    institutionName: '', institutionType: 'university', contactName: '', contactEmail: '',
    contactPhone: '', estimatedStudentCount: '', programmesOffered: '', applicationNotes: '',
  })

  if (!campaign) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Founding 50 Higher Institutions isn't currently open</h1>
        <p className="text-ink-muted mt-2">Applications aren't open yet. Please check back soon.</p>
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Application received</h1>
        <p className="text-ink-muted mt-2">Thank you — our team will review your application and reach out to {form.contactEmail}.</p>
      </div>
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await fetch('/api/founding-institutions/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignKey: campaign!.campaign_key, ...form }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Could not submit application')
      setSubmitting(false)
      return
    }
    setSuccess(true)
  }

  return (
    <div className="max-w-2xl mx-auto py-16">
      <div className="text-center mb-8">
        <span className="inline-block text-xs font-bold tracking-wide bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
          FOUNDING {campaign.max_institutions ?? ''}
        </span>
        <h1 className="text-3xl font-bold mt-4">{campaign.name}</h1>
        {campaign.description && <p className="text-ink-muted mt-2">{campaign.description}</p>}
      </div>

      {campaign.benefits?.filter(b => b.active).length > 0 && (
        <ul className="space-y-2 text-sm text-ink-muted mb-8">
          {campaign.benefits.filter(b => b.active).map(b => (
            <li key={b.key}><strong>{b.label}</strong> — {b.description}</li>
          ))}
        </ul>
      )}

      {campaign.terms_and_notes && (
        <p className="text-xs text-ink-faint border-t border-surface-100 pt-4 mb-8">{campaign.terms_and_notes}</p>
      )}

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <form onSubmit={submit} className="space-y-4">
        <input required placeholder="Institution name" value={form.institutionName}
          onChange={e => setForm({ ...form, institutionName: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" />
        <select value={form.institutionType} onChange={e => setForm({ ...form, institutionType: e.target.value })}
          className="w-full border rounded-lg px-3 py-2">
          <option value="university">University</option>
          <option value="polytechnic">Polytechnic</option>
          <option value="college_of_education">College of Education</option>
          <option value="other">Other</option>
        </select>
        <input required placeholder="Your name" value={form.contactName}
          onChange={e => setForm({ ...form, contactName: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" />
        <input required type="email" placeholder="Your email" value={form.contactEmail}
          onChange={e => setForm({ ...form, contactEmail: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" />
        <input placeholder="Phone (optional)" value={form.contactPhone}
          onChange={e => setForm({ ...form, contactPhone: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" />
        <input type="number" min={0} placeholder="Estimated student count (optional)" value={form.estimatedStudentCount}
          onChange={e => setForm({ ...form, estimatedStudentCount: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" />
        <textarea placeholder="Programmes offered (optional)" value={form.programmesOffered}
          onChange={e => setForm({ ...form, programmesOffered: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" rows={2} />
        <textarea placeholder="Anything else we should know? (optional)" value={form.applicationNotes}
          onChange={e => setForm({ ...form, applicationNotes: e.target.value })}
          className="w-full border rounded-lg px-3 py-2" rows={3} />
        <button disabled={submitting} className="w-full bg-brand-600 text-white rounded-lg py-3 font-semibold disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Apply'}
        </button>
      </form>
    </div>
  )
}