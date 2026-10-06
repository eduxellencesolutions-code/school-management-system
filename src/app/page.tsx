// src/app/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Eduxellence Results | Academic Operating System for Schools & Higher Institutions',
  description:
    'A connected academic operating system for schools, universities, polytechnics and colleges — admissions, curriculum, course registration, attendance, results, approvals and institutional records in one platform.',
  keywords: [
    'school management system', 'university management system', 'tertiary results platform',
    'academic ERP', 'student information system', 'course registration software',
    'CGPA calculator', 'result management system', 'eduxellence results',
  ],
  openGraph: {
    title: 'Eduxellence Results | The Academic Operating System for Modern Education Institutions',
    description:
      'From admission to academic record — one connected platform for schools, universities, polytechnics and colleges.',
    url: 'https://results.eduxellence.org',
    siteName: 'Eduxellence Results',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eduxellence Results | Academic Operating System',
    description: 'One connected platform for schools and higher institutions — from admission to academic record.',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-surface-200 px-4 sm:px-6 py-4 sticky top-0 bg-white/90 backdrop-blur-sm z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="font-bold text-lg sm:text-xl text-ink shrink-0">
            Eduxellence <span className="text-brand-500">Results</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-6">
            <Link href="#schools" className="hidden md:inline text-sm text-ink-muted hover:text-ink transition-colors">Schools</Link>
            <Link href="#higher-education" className="hidden md:inline text-sm text-ink-muted hover:text-ink transition-colors">Higher Education</Link>
            <Link href="#pricing" className="hidden md:inline text-sm text-ink-muted hover:text-ink transition-colors">Pricing</Link>
            <Link href="/login" className="btn-secondary btn-sm btn whitespace-nowrap">Sign in</Link>
            <Link href="/signup" className="btn-primary btn-sm btn whitespace-nowrap">Get started free</Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
          Free to start for schools — no credit card required
        </div>
        <h1 className="text-4xl sm:text-6xl font-bold text-ink leading-tight tracking-tight mb-6">
          The academic operating system<br />
          <span className="text-brand-500">for modern education institutions</span>
        </h1>
        <p className="text-lg text-ink-muted max-w-2xl mx-auto mb-10 leading-relaxed">
          Manage students, academic structures, courses, registration, results, attendance, fees,
          communication and institutional workflows from one connected platform — built for schools
          and higher institutions alike.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link href="/signup" className="btn-primary btn-lg btn">Start for free</Link>
          <Link href="#higher-education" className="btn-secondary btn-lg btn">Explore Higher Education</Link>
        </div>
      </section>

      {/* 2. Trusted / built for */}
      <section className="border-y border-surface-200 bg-surface-50 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 text-sm font-medium text-ink-muted">
          <span>Schools</span>
          <span className="text-surface-200">•</span>
          <span>Universities</span>
          <span className="text-surface-200">•</span>
          <span>Polytechnics</span>
          <span className="text-surface-200">•</span>
          <span>Colleges of Education</span>
          <span className="text-surface-200">•</span>
          <span>Education Providers</span>
        </div>
      </section>

      {/* 3. One platform. Different institutions. */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-3">One platform. Different institutions.</h2>
          <p className="text-ink-muted max-w-xl mx-auto">
            The same connected core — academic structure, records, approvals and reporting — adapts
            to how a school runs a term and how a university runs a semester.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card p-6">
            <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">Schools</div>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• Admissions & student records</li>
              <li>• Classes & subjects</li>
              <li>• Scores, results & report cards</li>
              <li>• Attendance & homework</li>
              <li>• Fee ledger</li>
              <li>• Parent portal</li>
              <li>• Promotion engine</li>
              <li>• Staff roles & permissions</li>
            </ul>
          </div>
          <div className="card p-6 border-brand-200">
            <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">Higher Institutions</div>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• Faculties & departments</li>
              <li>• Programmes & course catalogue</li>
              <li>• Student admissions & bulk import</li>
              <li>• Academic cohorts & curriculum versions</li>
              <li>• Course registration & lecturer assignment</li>
              <li>• Departmental review → Senate approval</li>
              <li>• CGPA & academic records</li>
              <li>• Institutional reporting</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 4. Academic operations, connected */}
      <section className="bg-surface-50 border-y border-surface-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-ink mb-3">Academic operations, connected</h2>
            <p className="text-ink-muted max-w-xl mx-auto">
              Not a collection of disconnected tools — one workflow, start to finish.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm font-medium">
            {['Admission', 'Onboarding', 'Curriculum', 'Registration', 'Attendance', 'Assessment', 'Results', 'Review', 'Approval', 'Academic Record'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="px-3 py-1.5 bg-white border border-surface-200 rounded-full text-ink shadow-card">{step}</span>
                {i < arr.length - 1 && <span className="text-brand-400">→</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Higher Education */}
      <section id="higher-education" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-semibold text-brand-600 bg-brand-50 px-3 py-1 rounded-full mb-4">HIGHER EDUCATION</span>
          <h2 className="text-3xl font-bold text-ink mb-3">An academic operating system for universities, polytechnics and colleges</h2>
          <p className="text-ink-muted max-w-2xl mx-auto">
            From faculty structure to Senate approval — the full tertiary academic lifecycle, connected.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {TERTIARY_FEATURES.map((f) => (
            <div key={f.title} className="card p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-ink mb-2">{f.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="text-center">
          <Link href="/pricing/higher-institutions" className="btn-primary btn-lg btn">View Higher Institutions Pricing</Link>
        </div>
      </section>

      {/* 6. School Management */}
      <section id="schools" className="max-w-6xl mx-auto px-6 py-20 border-t border-surface-200">
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

      {/* 7. Built for institutional scale */}
      <section className="bg-ink py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Built for institutional scale</h2>
            <p className="text-white/60 max-w-xl mx-auto">
              The infrastructure institutions actually need, not just a prettier spreadsheet.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCALE_CAPABILITIES.map((c) => (
              <div key={c} className="text-sm text-white/80 flex items-start gap-2">
                <span className="text-brand-400 mt-0.5">✓</span> {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. From spreadsheet chaos */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-3">From spreadsheet chaos to a connected academic system</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card p-6">
            <div className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-4">Without Eduxellence</div>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• Fragmented spreadsheets across departments</li>
              <li>• Manual result calculations and collation</li>
              <li>• Disconnected student records</li>
              <li>• Registration bottlenecks every semester</li>
              <li>• Admission data cleanup after every intake</li>
              <li>• Missing or informal approvals</li>
              <li>• Poor visibility into institutional status</li>
              <li>• Manual, scattered communication</li>
            </ul>
          </div>
          <div className="card p-6 border-brand-200">
            <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-4">With Eduxellence</div>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• One academic structure, one source of truth</li>
              <li>• Results calculated and reviewed automatically</li>
              <li>• Every student record connected end-to-end</li>
              <li>• Self-service course registration with deadlines</li>
              <li>• Bulk admission import with duplicate detection</li>
              <li>• Structured review → approval workflow</li>
              <li>• Real-time dashboards for every role</li>
              <li>• Built-in notifications and announcements</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 9. Feature ecosystem */}
      <section className="bg-surface-50 border-y border-surface-200 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-ink mb-12">A full feature ecosystem</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...FEATURES.slice(0, 4), ...TERTIARY_FEATURES.slice(0, 4)].map((f) => (
              <div key={f.title} className="bg-white rounded-lg p-4 border border-surface-200 shadow-card hover:shadow-modal transition-shadow">
                <div className="text-xl mb-2">{f.icon}</div>
                <h3 className="font-medium text-sm text-ink">{f.title}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Security & governance */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-ink mb-3">Security & governance</h2>
          <p className="text-ink-muted max-w-xl mx-auto">
            Institutional software needs institutional-grade data protection — not an afterthought.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { icon: '🔐', title: 'Row-level data isolation', description: 'Every institution\'s data is isolated at the database level — not just filtered in the app.' },
            { icon: '👥', title: 'Role-based permissions', description: 'Granular, assignable roles — grant exactly the access each staff member needs.' },
            { icon: '📜', title: 'Audit trails', description: 'Sensitive actions are logged with who, what and when — not just the final state.' },
            { icon: '🔒', title: 'Lock Results governance', description: 'Publish, then formally lock results as the official record — no silent edits after the fact.' },
            { icon: '🌐', title: 'Custom institutional domains', description: 'Run your portal on your own domain, with verified SSL.' },
            { icon: '🛡️', title: 'Secure authentication', description: 'Session-based authentication with server-verified authorization on every request.' },
          ].map((s) => (
            <div key={s.title} className="card p-5">
              <div className="text-2xl mb-3">{s.icon}</div>
              <h3 className="font-semibold text-ink mb-2">{s.title}</h3>
              <p className="text-sm text-ink-muted leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20 border-t border-surface-200">
        <h2 className="text-2xl font-bold text-center text-ink mb-3">Simple, transparent pricing</h2>
        <p className="text-center text-ink-muted mb-12">Choose the path that fits your institution.</p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
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
                <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">{plan.name}</div>
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
              <Link href="/signup" className={`btn btn-sm mt-auto ${plan.featured ? 'btn-primary' : 'btn-secondary'}`}>
                {plan.price === '₦0' ? 'Start free' : 'Get started'}
              </Link>
            </div>
          ))}
        </div>

        <div className="card p-8 bg-surface-50 border-brand-200 text-center">
          <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">Higher Institutions</div>
          <h3 className="text-xl font-bold text-ink mb-2">Per-student, per-term pricing that scales with you</h3>
          <p className="text-sm text-ink-muted max-w-xl mx-auto mb-6">
            From a single-faculty pilot to a multi-campus university, with a dedicated negotiated tier
            for the largest institutions.
          </p>
          <Link href="/pricing/higher-institutions" className="btn-primary btn btn-lg">See Higher Institutions Pricing</Link>
        </div>
      </section>

      {/* 12. Final CTA */}
      <section className="bg-brand-500 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to modernize your institution?</h2>
          <p className="text-white/80 mb-10">Explore Eduxellence Results or talk to us about your institution.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/signup" className="btn-lg btn bg-white text-brand-600 hover:bg-white/90">Start for free</Link>
            <Link href="/pricing/higher-institutions" className="btn-lg btn border border-white text-white hover:bg-white/10">Explore Higher Education</Link>
            <Link href="/founding-institutions/apply" className="btn-lg btn border border-white text-white hover:bg-white/10">Talk to Eduxellence</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="font-semibold text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </div>
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} Eduxellence. The academic operating system for modern education institutions.
          </p>
        </div>
      </footer>
    </div>
  )
}

const SCALE_CAPABILITIES = [
  'Multi-tenant architecture',
  'Role-based permissions',
  'Secure institutional data isolation',
  'Audit trails',
  'Configurable academic workflows',
  'Institution branding',
  'Custom institutional domains',
  'Bulk operations',
  'Automated workflows & reminders',
  'Notifications',
  'Institutional reporting',
  'Secure session-based authentication',
]

const TERTIARY_FEATURES = [
  { icon: '🏛️', title: 'Faculty & department structure', description: 'Model your institution\'s real academic structure — faculties, departments and programmes.' },
  { icon: '📚', title: 'Programmes & course catalogue', description: 'Maintain your full course catalogue with curriculum versions over time.' },
  { icon: '📥', title: 'Admission & bulk import', description: 'Import entire cohorts with duplicate detection, or admit students one at a time.' },
  { icon: '🎓', title: 'Cohorts & curriculum versions', description: 'Track students through intakes, tracking which curriculum version applies to each.' },
  { icon: '📝', title: 'Course registration', description: 'Self-service registration against deadlines, with elective groups and lecturer assignment.' },
  { icon: '✅', title: 'Departmental review → Senate approval', description: 'A real multi-stage approval chain — departmental, faculty, registry, then Senate.' },
  { icon: '📈', title: 'GPA, CGPA & academic history', description: 'Automatic GPA/CGPA calculation with a full academic record per student.' },
  { icon: '🔔', title: 'Registration deadlines & reminders', description: 'Configurable deadlines with automated student reminders.' },
  { icon: '📄', title: 'Result publication & transcripts', description: 'Publish results to students, with PDF export for official records.' },
]

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
    description: 'For very small schools just getting started.',
    featured: false,
    features: ['Up to 100 students', 'Attendance & affective/psychomotor', 'Parent portal with access codes', 'Promotion engine', 'School logo & branding'],
  },
  {
    name: 'Standard School',
    price: '₦35,000',
    period: 'per term',
    description: 'For growing schools — our best value per student.',
    featured: true,
    features: ['Up to 300 students', 'Everything in Small School', 'Homework tracking', 'Advanced audit logs', 'Priority support'],
  },
  {
    name: 'Premium School',
    price: '₦75,000',
    period: 'per term',
    description: 'For established schools. Capacity scales as you grow.',
    featured: false,
    features: ['Up to 500 students (capacity extendable)', 'Everything in Standard School', 'Fee ledger with receipts', 'Custom staff roles & permissions', 'Dedicated support'],
  },
]