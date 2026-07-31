import { ShieldOff } from 'lucide-react'

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
      <div className="card p-8 max-w-md text-center flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <ShieldOff size={22} className="text-red-600" />
        </div>
        <h1 className="text-lg font-semibold text-ink">Access Denied</h1>
        <p className="text-sm text-ink-muted">
          Your account is authenticated, but it isn't assigned a Platform
          Administration role. If you believe this is a mistake, contact
          your platform administrator.
        </p>
        <a
          href="https://results.eduxellence.org/workspaces"
          className="btn-primary btn mt-2"
        >
          Return to your workspace
        </a>
      </div>
    </div>
  )
}