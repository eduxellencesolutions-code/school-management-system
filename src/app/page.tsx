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
            <Link href="#features" className="text-sm text-ink-muted hover:text-ink transition-colors">
              Features
            </Link>
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
          A complete academic operating system<br />
          <span className="text-brand-500">for African schools</span>
        </h1>
        <p className="text-lg text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Results, attendance, homework, fees, parent access, and staff permissions —
          all in one platform built around how schools actually run a term.
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
          Free plan: 1 class · Up to 30 students · Excel export · No time limit
        </p>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-200">
        <h2 className="text-2xl font-bold text-center text-ink mb-3">
          Everything a school needs, in one place
        </h2>
        <p className="text-center text-ink-muted mb-12 max-w-xl mx-auto">
          From continuous score entry to promotion decisions to parents checking results
          on their phone — one connected system, not a dozen spreadsheets.
        </p>
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
    description: 'Context-aware comments for each student — generated automatically, editable anytime.',
  },
  {
    icon: '📅',
    title: 'Attendance tracking',
    description: 'Mark daily attendance in seconds. Rates calculate automatically and feed straight into report cards.',
  },
  {
    icon: '🎭',
    title: 'Affective & psychomotor ratings',
    description: 'Track character and skill development — punctuality, leadership, neatness, and more — all term long.',
  },
  {
    icon: '📝',
    title: 'Homework tracking',
    description: 'Assign homework and track submissions per student, with completion rates that show up on report cards.',
  },
  {
    icon: '💰',
    title: 'Fee ledger',
    description: 'A real fee account per student per term — charges, payments, receipts, and outstanding balances, always accurate.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Parent portal, no password needed',
    description: 'Parents get a simple access code — no username, no password — to see every child\'s results, attendance, and homework in one place.',
  },
  {
    icon: '🎓',
    title: 'Promotion engine',
    description: 'Set your promotion rules once, preview recommendations for the whole class, then confirm with one click — with full academic history preserved.',
  },
  {
    icon: '🔒',
    title: 'Lock Results governance',
    description: 'Publish results for parents, then formally lock them as the official record — no accidental edits after the fact.',
  },
  {
    icon: '🛡️',
    title: 'Staff roles & permissions',
    description: 'Create custom roles — Bursar, Examination Officer, Academic Coordinator — and grant exactly the access each person needs.',
  },
  {
    icon: '📢',
    title: 'Announcements',
    description: 'Post school-wide updates to staff or parents, with automatic expiry — no more chasing people on WhatsApp.',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '₦0',
    period: 'forever',
    description: 'For teachers who want to try before they commit.',
    featured: false,
    features: ['1 class', 'Up to 30 students', 'Auto calculations', 'PDF reports', 'Excel export'],
  },
  {
    name: 'Solo Teacher Pro',
    price: '₦3,000',
    period: 'per term',
    description: 'For individual teachers managing any number of classes.',
    featured: false,
    features: ['Unlimited classes', 'Up to 150 students', 'PDF reports', 'AI remarks', 'Broadsheet generation'],
  },
  {
    name: 'Small School',
    price: '₦15,000',
    period: 'per term',
    description: 'For nursery, primary, and small secondary schools.',
    featured: true,
    features: [
      'Up to 500 students, 25 teachers',
      'Attendance & affective/psychomotor',
      'Parent portal with access codes',
      'Promotion engine',
      'School logo & branding',
    ],
  },
  {
    name: 'Standard School',
    price: '₦35,000',
    period: 'per term',
    description: 'For larger schools with more students and staff.',
    featured: false,
    features: [
      'Up to 2,000 students, 100 teachers',
      'Everything in Small School',
      'Homework tracking',
      'Advanced audit logs',
      'Priority support',
    ],
  },
  {
    name: 'Premium School',
    price: '₦75,000',
    period: 'per term',
    description: 'For large private schools and multi-campus institutions.',
    featured: false,
    features: [
      'Up to 5,000 students, 300 teachers',
      'Everything in Standard School',
      'Fee ledger with receipts',
      'Custom staff roles & permissions',
      'Dedicated support',
    ],
  },
]