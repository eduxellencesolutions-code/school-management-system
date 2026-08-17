'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, Link2, CheckCircle2, Clock } from 'lucide-react'

interface LinkedParent {
  parentId: string
  fullName: string
  phone: string | null
  email: string | null
  portalActive: boolean
}

interface Props {
  learnerId: string
  guardianName: string | null
  guardianPhone: string | null
  guardianEmail: string | null
  linkedParents: LinkedParent[]
}

export default function ParentGuardianCard({
  learnerId,
  guardianName,
  guardianPhone,
  guardianEmail,
  linkedParents,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [parents, setParents] = useState(linkedParents)

  const alreadyLinkedToGuardian = parents.some(
    (p) => (guardianPhone && p.phone === guardianPhone) || (guardianEmail && p.email === guardianEmail)
  )

  async function handleLink() {
    if (!guardianName || (!guardianPhone && !guardianEmail)) {
      toast.error('Add a guardian name and phone/email on this student first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/parents/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          parentFullName: guardianName,
          parentEmail: guardianEmail || undefined,
          parentPhone: guardianPhone || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to link parent')
        return
      }
      toast.success('Parent portal account linked')
      setParents((prev) => [
        ...prev,
        {
          parentId: data.parentId,
          fullName: guardianName,
          phone: guardianPhone,
          email: guardianEmail,
          portalActive: false,
        },
      ])
    } catch {
      toast.error('Failed to link parent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-ink">Parent / Guardian</h2>

      {!guardianName && !guardianPhone && !guardianEmail ? (
        <p className="text-sm text-ink-muted">No guardian information on file for this student.</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-ink">{guardianName || 'Unnamed guardian'}</p>
          {guardianPhone && <p className="text-xs text-ink-muted">{guardianPhone}</p>}
          {guardianEmail && <p className="text-xs text-ink-muted">{guardianEmail}</p>}
        </div>
      )}

      {parents.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-surface-200">
          {parents.map((p) => (
            <div key={p.parentId} className="flex items-center justify-between text-sm">
              <span className="text-ink">{p.fullName}</span>
              {p.portalActive ? (
                <span className="badge badge-green flex items-center gap-1">
                  <CheckCircle2 size={12} /> Portal active
                </span>
              ) : (
                <span className="badge badge-amber flex items-center gap-1">
                  <Clock size={12} /> Linked, not yet activated
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {!alreadyLinkedToGuardian && (guardianPhone || guardianEmail) && (
        <button
          onClick={handleLink}
          disabled={loading}
          className="btn-secondary btn-sm btn flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          {loading ? 'Linking…' : 'Link Parent Portal Account'}
        </button>
      )}
    </div>
  )
}