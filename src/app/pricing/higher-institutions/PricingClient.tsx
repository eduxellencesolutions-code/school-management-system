// src/app/pricing/higher-institutions/PricingClient.tsx
'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'

type Tier = {
  tier_key: string; name: string; min_students: number; max_students: number | null
  price_per_student_per_term: number | null; is_custom: boolean
}
type PricingData = {
  tiers: Tier[]
  capabilities: Record<string, string[]>
  terms_per_year: number
  annual_discount_rate: number
} | null

const CAPABILITY_LABELS: Record<string, string> = {
  'tertiary.students': 'Student records',
  'tertiary.faculty': 'Faculty structure',
  'tertiary.department': 'Departments',
  'tertiary.programme': 'Programmes',
  'tertiary.cohort': 'Cohorts',
  'tertiary.courses': 'Course catalogue',
  'tertiary.course_registration': 'Course registration',
  'tertiary.lecturer_assignment': 'Lecturer assignment',
  'tertiary.ca_exam_entry': 'CA & exam score entry',
  'tertiary.grading': 'Grading scales',
  'tertiary.results': 'Results management',
  'tertiary.gpa': 'GPA calculation',
  'tertiary.cgpa': 'CGPA & academic record',
  'tertiary.department_review': 'Departmental review',
  'tertiary.faculty_review': 'Faculty review',
  'tertiary.registry_review': 'Registry review',
  'tertiary.senate_approval': 'Senate approval',
  'tertiary.publication': 'Result publication',
  'tertiary.student_portal': 'Student portal',
  'tertiary.published_results': 'Published results access',
  'tertiary.academic_history': 'Academic history',
  'tertiary.result_pdf': 'Result PDF export',
  'tertiary.audit_trail': 'Audit trail',
  'tertiary.parent_portal': 'Parent portal',
  'tertiary.parent_view_results': 'Parent result visibility',
  'tertiary.bulk_operations': 'Bulk operations',
  'tertiary.analytics': 'Analytics dashboard',
  'tertiary.priority_support': 'Priority support',
  'tertiary.multi_campus': 'Multi-campus support',
  'tertiary.integrations': 'Integrations',
  'tertiary.custom_reporting': 'Custom reporting',
}

export default function HigherInstitutionsPricingClient({ data }: { data: PricingData }) {
  const [studentCount, setStudentCount] = useState(2500)

  const matchedTier = useMemo(() => {
    if (!data) return null
    return data.tiers.find(t =>
      studentCount >= t.min_students && (t.max_students === null || studentCount <= t.max_students)
    ) ?? null
  }, [data, studentCount])

  const estimate = useMemo(() => {
    if (!data || !matchedTier || matchedTier.price_per_student_per_term === null) return null
    const termly = matchedTier.price_per_student_per_term * studentCount
    const annualList = termly * data.terms_per_year
    const annualDiscounted = Math.round(annualList * (1 - data.annual_discount_rate))
    return { termly, annualList, annualDiscounted }
  }, [data, matchedTier, studentCount])

  if (!data) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-bold">Pricing is temporarily unavailable</h1>
        <p className="text-ink-muted mt-2">Please try again shortly, or contact us directly.</p>
      </div>
    )
  }

  const allCapabilityKeys = Array.from(new Set(Object.values(data.capabilities).flat())).sort()

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-ink">Pricing for Universities, Polytechnics & Colleges</h1>
        <p className="text-lg text-ink-muted max-w-2xl mx-auto mt-4">
          Transparent per-student, per-term pricing that scales with your institution — from a single faculty pilot to a large university.
        </p>
      </div>

      {/* Live estimator */}
      <div className="card p-6 max-w-xl mx-auto mb-16">
        <label className="text-sm font-medium text-ink block mb-2">Estimate your cost</label>
        <input
          type="range" min={10} max={15000} step={10}
          value={studentCount}
          onChange={e => setStudentCount(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-ink-muted">{studentCount.toLocaleString()} students</span>
          {matchedTier && <span className="text-sm font-semibold text-brand-600">{matchedTier.name}</span>}
        </div>

        {estimate ? (
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-ink">₦{estimate.termly.toLocaleString()}</div>
              <div className="text-xs text-ink-muted">per term</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-ink">₦{estimate.annualDiscounted.toLocaleString()}</div>
              <div className="text-xs text-ink-muted">per year (save {Math.round(data.annual_discount_rate * 100)}%)</div>
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center">
            <p className="text-ink-muted text-sm">At this scale, pricing is negotiated individually.</p>
            <Link href="/founding-institutions/apply" className="btn-primary btn-sm btn mt-3 inline-block">Talk to us</Link>
          </div>
        )}
      </div>

      {/* Tier cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-16">
        {data.tiers.map(tier => (
          <div key={tier.tier_key} className={`card p-5 flex flex-col gap-3 ${matchedTier?.tier_key === tier.tier_key ? 'border-brand-500 ring-1 ring-brand-500' : ''}`}>
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{tier.name}</div>
            {tier.is_custom ? (
              <div className="text-xl font-bold text-ink">Custom</div>
            ) : (
              <div>
                <div className="text-xl font-bold text-ink">₦{tier.price_per_student_per_term?.toLocaleString()}</div>
                <div className="text-xs text-ink-muted">per student / term</div>
              </div>
            )}
            <div className="text-xs text-ink-faint">
              {tier.min_students.toLocaleString()}{tier.max_students ? `–${tier.max_students.toLocaleString()}` : '+'} students
            </div>
            <Link
              href={tier.is_custom ? '/founding-institutions/apply' : '/signup'}
              className="btn-secondary btn-sm btn mt-auto"
            >
              {tier.is_custom ? 'Talk to us' : 'Get started'}
            </Link>
          </div>
        ))}
      </div>

      {/* Capability comparison */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-200">
              <th className="text-left py-3 pr-4 text-ink-muted font-medium">Capability</th>
              {data.tiers.map(t => (
                <th key={t.tier_key} className="text-center py-3 px-2 text-ink font-semibold">{t.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allCapabilityKeys.map(key => (
              <tr key={key} className="border-b border-surface-100">
                <td className="py-2.5 pr-4 text-ink-muted">{CAPABILITY_LABELS[key] ?? key}</td>
                {data.tiers.map(t => (
                  <td key={t.tier_key} className="text-center py-2.5 px-2">
                    {data.capabilities[t.tier_key]?.includes(key)
                      ? <span className="text-green-500 font-bold">✓</span>
                      : <span className="text-ink-faint">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}