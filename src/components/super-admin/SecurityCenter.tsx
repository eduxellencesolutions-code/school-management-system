'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import MFAEnrollment from '@/components/super-admin/MFAEnrollment'  // ✅ NEW

export default function SecurityCenter() {
  const [logs, setLogs] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/platform-staff/audit-log').then(r => r.json()),
      fetch('/api/platform-staff/security-alerts').then(r => r.json()),
    ]).then(([logData, alertData]) => {
      setLogs(logData.logs ?? [])
      setAlerts(alertData.alerts ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  return (
    <div className="flex flex-col gap-4">
      {/* ✅ NEW: MFA Enrollment */}
      <MFAEnrollment />

      {alerts.length > 0 && (
        <div className="card p-5 border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-600" />
            <h2 className="font-semibold text-sm text-ink">Open Security Alerts</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {alerts.map(a => (
              <div key={a.id} className="py-2 text-sm">
                <p className="text-ink">{a.description}</p>
                <p className="text-xs text-ink-faint">{a.severity} · {new Date(a.created_at).toLocaleString('en-NG')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header font-semibold text-sm">Audit Log</div>
        <div className="divide-y divide-surface-100 max-h-96 overflow-y-auto">
          {logs.map(l => (
            <div key={l.id} className="p-3 text-sm">
              <p className="text-ink">{l.actorName} — {l.action.replace(/_/g, ' ')}</p>
              {l.reason && <p className="text-xs text-ink-muted">Reason: {l.reason}</p>}
              <p className="text-xs text-ink-faint">{new Date(l.created_at).toLocaleString('en-NG')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}