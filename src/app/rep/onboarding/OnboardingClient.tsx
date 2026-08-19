'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Steps = { profile_completed: boolean; passport_uploaded: boolean; passport_approved: boolean; agreement_accepted: boolean }

export default function OnboardingClient() {
  const [status, setStatus] = useState<{ steps: Steps; percent: number; fullyOnboarded: boolean } | null>(null)
  const [passport, setPassport] = useState<{ photoStatus: string; rejectionReason: string | null; signedUrl: string | null } | null>(null)
  const [agreement, setAgreement] = useState<{ version: number; content: string; accepted: boolean; acceptedAt: string | null } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [checked, setChecked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadAll() {
    setError(null)
    const [s, p, a] = await Promise.all([
      fetch('/api/representatives/onboarding-status').then(r => r.json()),
      fetch('/api/representatives/passport').then(r => r.json()),
      fetch('/api/representatives/agreement').then(r => r.json()),
    ])
    if (s.error || p.error || a.error) {
      setError(s.error ?? p.error ?? a.error ?? 'Something went wrong loading your onboarding status')
      return
    }
    setStatus(s); setPassport(p); setAgreement(a)
  }
  useEffect(() => { loadAll() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const path = `${user.id}/passport-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('representative-passports')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError

      const res = await fetch('/api/representatives/passport', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      await loadAll()
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleAcceptAgreement() {
    if (!agreement || !checked) return
    setAccepting(true)
    setError(null)
    const res = await fetch('/api/representatives/agreement', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: agreement.version }),
    })
    const json = await res.json()
    if (json.error) setError(json.error)
    else await loadAll()
    setAccepting(false)
  }

  if (!status || !passport || !agreement) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Representative Onboarding</h1>
        <p className="text-gray-600 mt-1">{status.percent}% complete</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${status.percent}%` }} />
        </div>
        <ul className="mt-4 space-y-1 text-sm">
          <li>{status.steps.profile_completed ? '✅' : '⬜'} Profile completed</li>
          <li>{status.steps.passport_uploaded ? '✅' : '⬜'} Passport uploaded</li>
          <li>{status.steps.passport_approved ? '✅' : status.steps.passport_uploaded ? '⏳' : '⬜'} Passport approved</li>
          <li>{status.steps.agreement_accepted ? '✅' : '⬜'} Agreement accepted</li>
        </ul>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border rounded-lg p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Passport Photo</h2>
        {passport.signedUrl && (
          <img src={passport.signedUrl} alt="Passport" className="w-32 h-32 object-cover rounded mb-3 border" />
        )}
        <p className="text-sm mb-3">
          Status:{' '}
          {passport.photoStatus === 'approved' && <span className="text-green-600 font-medium">Approved</span>}
          {passport.photoStatus === 'pending_review' && <span className="text-amber-600 font-medium">Pending approval</span>}
          {passport.photoStatus === 'rejected' && <span className="text-red-600 font-medium">Rejected — {passport.rejectionReason}</span>}
          {passport.photoStatus === 'not_submitted' && <span className="text-gray-500">Not submitted</span>}
        </p>
        {passport.photoStatus !== 'approved' && (
          <label className="inline-block">
            <span className="btn-sm btn bg-blue-50 text-blue-600 cursor-pointer">
              {uploading ? 'Uploading…' : passport.photoStatus === 'rejected' ? 'Re-upload Photo' : 'Upload Photo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        )}
      </div>

      <div className="border rounded-lg p-5">
        <h2 className="font-semibold text-gray-900 mb-2">Representative Agreement (v{agreement.version})</h2>
        {agreement.accepted ? (
          <p className="text-sm text-green-600 font-medium">Accepted on {new Date(agreement.acceptedAt!).toLocaleDateString()}</p>
        ) : (
          <>
            <div className="text-sm text-gray-700 whitespace-pre-wrap border rounded p-3 max-h-60 overflow-y-auto mb-3">
              {agreement.content}
            </div>
            <label className="flex items-center gap-2 text-sm mb-3">
              <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />
              I have read and accept this agreement
            </label>
            <button
              disabled={!checked || accepting}
              onClick={handleAcceptAgreement}
              className="btn-primary btn-sm btn disabled:opacity-50"
            >
              {accepting ? 'Submitting…' : 'Accept Agreement'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}