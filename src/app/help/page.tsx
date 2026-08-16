'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    content: [
      'Eduxellence Results is built around how a school actually runs a term — set up your school, add your classes and students, configure grading, and start entering results.',
      'After you sign up, the in-app Setup Guide walks you through everything step by step, in the right order, and shows your progress as you go.',
    ],
  },
  {
    id: 'school-setup',
    title: 'School Setup',
    content: [
      'Set your school name, logo, motto, and contact information from Settings. This information appears on report cards and other official documents.',
      'You\'ll also need to set your current academic session and term before most other features become fully usable.',
    ],
  },
  {
    id: 'students-classes',
    title: 'Students & Classes',
    content: [
      'Create your classes first, then add students to them — either one at a time, or in bulk by uploading an Excel/CSV file if you already have your class list.',
      'Each student belongs to one class, and results, attendance, and fees are all organized around class membership.',
    ],
  },
  {
    id: 'subjects-grading',
    title: 'Subjects & Grading',
    content: [
      'Create subjects and assign them to the classes that take them.',
      'Grading configuration determines how raw scores turn into grades, remarks, and positions — set this up before entering results so calculations are correct from the start.',
    ],
  },
  {
    id: 'results',
    title: 'Results',
    content: [
      'Enter scores for your students, and Eduxellence automatically calculates totals, averages, percentages, and grades based on your grading configuration.',
      'Once results are finalized, you can lock them to prevent further changes, and publish them so they\'re visible to parents and can be printed as report cards.',
    ],
  },
  {
    id: 'attendance',
    title: 'Attendance',
    content: [
      'Mark daily attendance per class and review attendance rates over time.',
      'Attendance is available on select plans — check your current plan under Settings if you don\'t see this option.',
    ],
  },
  {
    id: 'homework',
    title: 'Homework',
    content: [
      'Create assignments for a class, and track submissions as students complete them.',
      'Homework is available on select plans — check your current plan under Settings if you don\'t see this option.',
    ],
  },
  {
    id: 'fees',
    title: 'Fees',
    content: [
      'Set up fee structures per class and term, then record payments and track outstanding balances as they come in.',
      'Once a fee structure has been issued to students, it\'s locked to keep financial records consistent.',
    ],
  },
  {
    id: 'parent-portal',
    title: 'Parent Portal',
    content: [
      'Link parents to their children so they can view published results, attendance, and homework directly.',
      'Parents access their portal separately from the main school login — you\'ll manage their access from the Parent Portal section of your dashboard.',
    ],
  },
  {
    id: 'promotion',
    title: 'Promotion',
    content: [
      'At the end of a session, the Promotion Center reviews each student\'s results and recommends whether they should be promoted or repeat the class.',
      'You can review and override any recommendation before confirming promotions for the new session.',
    ],
  },
  {
    id: 'staff-permissions',
    title: 'Staff & Permissions',
    content: [
      'Add teachers and other staff, then assign each person a role that controls exactly what they can see and do — from full administrative access down to a single subject or class.',
      'You can create custom roles to match how your school is actually organized, rather than using only the built-in ones.',
    ],
  },
  {
    id: 'subscription-plans',
    title: 'Subscription & Plans',
    content: [
      'Eduxellence offers a Free plan to get started, plus paid plans for individual teachers and for schools of different sizes, each unlocking more students, staff, and features.',
      'You can view current plan details and upgrade at any time from Settings — your data stays intact when you upgrade.',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    content: [
      'If something isn\'t showing up as expected, check that your current academic term is set correctly — many pages depend on it.',
      'If a feature seems locked, it may not be included on your current plan — you\'ll see a note explaining what plan unlocks it.',
      'Still stuck? Use the chat button in the corner of the screen to reach us directly.',
    ],
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    content: [
      'Can I import students from Excel? Yes — the Students page supports bulk upload from a CSV/Excel file with the required columns.',
      'Can I upgrade or downgrade my plan later? Yes, at any time from Settings, without losing your existing data.',
      'Does the platform support multiple teachers? Yes, on Small School plans and above — Solo Teacher Pro is designed for a single individual teacher.',
      'How do parents access results? Parents get their own portal login, separate from staff accounts, once you link them to a student.',
    ],
  },
]

export default function HelpPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-surface-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-ink">
            Eduxellence <span className="text-brand-500">Results</span>
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/login" className="btn-secondary btn-sm btn">Sign in</Link>
            <Link href="/signup" className="btn-primary btn-sm btn">Get started free</Link>
          </div>
          <button
            className="sm:hidden text-ink-muted"
            onClick={() => setMobileNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileNavOpen && (
          <div className="sm:hidden max-w-6xl mx-auto mt-3 flex flex-col gap-2 pb-2">
            <Link href="/login" className="btn-secondary btn-sm btn w-full">Sign in</Link>
            <Link href="/signup" className="btn-primary btn-sm btn w-full">Get started free</Link>
          </div>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-ink">Help Centre</h1>
          <p className="text-ink-muted mt-2">
            Everything you need to get your school or classroom running on Eduxellence Results.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-10">
          <aside className="md:w-56 flex-shrink-0">
            <nav className="md:sticky md:top-8 flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-sm text-ink-muted hover:text-brand-600 whitespace-nowrap px-2 py-1.5 rounded hover:bg-surface-50 transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex-1 flex flex-col gap-12">
            {SECTIONS.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-8">
                <h2 className="text-xl font-semibold text-ink mb-3">{s.title}</h2>
                <div className="flex flex-col gap-2">
                  {s.content.map((p, i) => (
                    <p key={i} className="text-sm text-ink-muted leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}