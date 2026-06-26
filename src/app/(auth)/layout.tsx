export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </h1>
          <p className="text-sm text-ink-muted mt-1">Smart academic result management</p>
        </div>
        {children}
      </div>
    </div>
  )
}
