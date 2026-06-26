import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-surface-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-bold text-xl text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="#pricing" className="text-sm text-ink-muted hover:text-ink transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="btn-secondary btn-sm btn">
              Sign in
            </Link>
            <Link href="/signup" className="btn-primary btn-sm btn">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
          Free to start — no credit card required
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-tight tracking-tight mb-6">
          Results management that<br />
          <span className="text-brand-500">works as you teach</span>
        </h1>
        <p className="text-lg text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Enter scores continuously throughout the term. Watch calculations happen automatically.
          Generate professional broadsheets and report cards in seconds — not days.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="btn-primary btn-lg btn">
            Start for free
          </Link>
          <Link href="/login" className="btn-secondary btn-lg btn">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-ink-faint mt-4">
          Free plan: 1 class · 30 students · Excel export · No time limit
        </p>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-200">
        <h2 className="text-2xl font-bold text-center text-ink mb-12">
          Everything you need, nothing you don't
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-200">
        <h2 className="text-2xl font-bold text-center text-ink mb-3">Simple, affordable pricing</h2>
        <p className="text-center text-ink-muted mb-12">
          Built for Nigerian educators. Priced to match.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`card p-5 flex flex-col gap-4 ${plan.featured ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}
            >
              {plan.featured && (
                <div className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full self-start">
                  Most popular
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  {plan.name}
                </div>
                <div className="text-2xl font-bold text-ink">{plan.price}</div>
                <div className="text-xs text-ink-muted">{plan.period}</div>
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">{plan.description}</p>
              <ul className="flex flex-col gap-2 text-xs">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-ink-muted">
                    <span className="text-green-500 font-bold mt-0.5">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`btn btn-sm mt-auto ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}
              >
                {plan.price === '₦0' ? 'Start free' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-semibold text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </div>
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} Eduxellence. Built for African educators.
          </p>
        </div>
      </footer>
    </div>
  )
}

const FEATURES = [
  {
    icon: '⚡',
    title: 'Auto-save as you type',
    description: 'Every keystroke is saved automatically. No save button. No lost work. Ever.',
  },
  {
    icon: '🧮',
    title: 'Instant calculations',
    description: 'Totals, averages, percentages, grades, and class positions compute the moment a score is entered.',
  },
  {
    icon: '📊',
    title: 'Broadsheet in one click',
    description: 'Generate the complete class broadsheet as a formatted Excel file whenever you need it.',
  },
  {
    icon: '📄',
    title: 'Professional report cards',
    description: 'Branded PDF report cards with your school logo, motto, and principal signature.',
  },
  {
    icon: '📥',
    title: 'Bulk CSV upload',
    description: 'Enrol your entire class at once by uploading a spreadsheet. Duplicates are detected automatically.',
  },
  {
    icon: '🤖',
    title: 'AI-generated remarks',
    description: 'Context-aware comments for each student — "Shows strong improvement in Mathematics" — generated automatically.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '₦0',
    period: 'forever',
    description: 'For teachers who want to try before they commit.',
    featured: false,
    features: ['1 class', 'Up to 30 students', 'Auto calculations', 'Excel export'],
  },
  {
    name: 'Teacher',
    price: '₦1,000',
    period: 'per term',
    description: 'For individual teachers managing any number of classes.',
    featured: false,
    features: ['Unlimited classes', 'Unlimited students', 'PDF reports', 'AI remarks', 'Analytics'],
  },
  {
    name: 'Small School',
    price: '₦10,000',
    period: 'per year',
    description: 'For nursery, primary, and small secondary schools.',
    featured: true,
    features: ['Up to 300 students', 'Multiple teachers', 'School logo & branding', 'Official report cards', 'PDF + Excel'],
  },
  {
    name: 'Standard School',
    price: '₦20,000',
    period: 'per year',
    description: 'For larger schools with more students and staff.',
    featured: false,
    features: ['Up to 1,000 students', 'Multiple teachers', 'Full branding', 'Advanced analytics', 'Priority support'],
  },
  {
    name: 'Premium School',
    price: '₦50,000',
    period: 'per year',
    description: 'For large private schools and multi-campus institutions.',
    featured: false,
    features: ['Unlimited students', 'Unlimited teachers', 'AI features', 'Parent portal', 'Dedicated support'],
  },
]
