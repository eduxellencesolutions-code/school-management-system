'use client'
import { useState } from 'react'
import { updateStudentStatus } from '@/app/(dashboard)/students/actions'

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  withdrawn: 'Withdrawn',
  transferred: 'Transferred',
  graduated: 'Graduated / Completed',
  suspended: 'Suspended',
}

export default function StudentStatusForm({
  studentId, currentStatus, statusReason, statusEffectiveDate, destinationSchool,
}: {
  studentId: string
  currentStatus: string
  statusReason: string | null
  statusEffectiveDate: string | null
  destinationSchool: string | null
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(currentStatus === 'active' ? 'withdrawn' : currentStatus)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-semibold text-sm text-ink">Student Status</h2>
        <span className={`badge ${currentStatus === 'active' ? 'badge-green' : 'badge-gray'}`}>
          {STATUS_LABELS[currentStatus] ?? currentStatus}
        </span>
      </div>

      {currentStatus !== 'active' && (statusReason || statusEffectiveDate) && (
        <p className="text-xs text-ink-muted mb-3">
          {statusEffectiveDate && `Effective ${new Date(statusEffectiveDate).toLocaleDateString('en-NG')}`}
          {statusReason && ` — ${statusReason}`}
          {destinationSchool && ` — moved to ${destinationSchool}`}
        </p>
      )}

      {!open ? (
        <button onClick={() => setOpen(true)} className="btn-secondary btn-sm btn">
          Manage status
        </button>
      ) : (
        <form action={updateStudentStatus} className="flex flex-col gap-3 mt-2">
          <input type="hidden" name="id" value={studentId} />

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">New status</label>
            <select name="status" value={status} onChange={e => setStatus(e.target.value)} className="input max-w-xs">
              <option value="active">Active</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="transferred">Transferred</option>
              <option value="graduated">Graduated / Completed</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Effective date</label>
            <input type="date" name="effective_date" defaultValue={new Date().toISOString().split('T')[0]} className="input max-w-xs" />
          </div>

          {status === 'transferred' && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Destination school</label>
              <input type="text" name="destination_school" placeholder="School name" className="input max-w-xs" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Reason / notes</label>
            <textarea name="reason" rows={2} className="input max-w-md" placeholder="Optional" />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary btn-sm btn">Save status</button>
            <button type="button" onClick={() => setOpen(false)} className="btn-sm btn">Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}