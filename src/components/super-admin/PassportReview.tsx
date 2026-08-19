'use client'
export default function PassportReview({ rep, onDone }: { rep: any; onDone: () => void }) {
  async function review(approve: boolean) {
    const reason = approve ? null : prompt('Reason for rejection?')
    if (!approve && !reason) return
    const res = await fetch(`/api/platform-staff/representatives/${rep.id}/photo/review`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approve, reason }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else onDone()
  }

  if (!rep.photo_url) return <span className="text-xs text-ink-faint">Not submitted</span>

  return (
    <div className="text-xs space-y-1">
      <span className={
        rep.photo_status === 'approved' ? 'text-green-600 font-medium' :
        rep.photo_status === 'rejected' ? 'text-red-600 font-medium' : 'text-amber-600 font-medium'
      }>
        {rep.photo_status === 'pending_review' ? 'Pending review' : rep.photo_status}
      </span>
      {rep.photo_status === 'pending_review' && (
        <div className="flex gap-2 mt-1">
          <button onClick={() => review(true)} className="btn-sm btn bg-green-50 text-green-600">Approve</button>
          <button onClick={() => review(false)} className="btn-sm btn bg-red-50 text-red-600">Reject</button>
        </div>
      )}
    </div>
  )
}