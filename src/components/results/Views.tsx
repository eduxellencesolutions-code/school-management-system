// FILE: src/components/results/Views.tsx
'use client'

import { useMemo } from 'react'
import type { BundleCourse, ResultsBundle } from '@/lib/results/bundleTypes'
import { useCountUp } from './useCountUp'

export const fmt = (n: number | null | undefined, d = 2): string =>
  n === null || n === undefined ? '—' : Number(n).toFixed(d)

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' } as const
export const CARD = 'rounded-2xl border border-[var(--r-line)] bg-[var(--r-card)] p-4 md:p-5'

const OUTCOME_LABEL: Record<string, string> = {
  pass: 'Pass', fail: 'Fail', incomplete: 'Incomplete', deferred: 'Deferred', withdrawn: 'Withdrawn', exempt: 'Exempt',
}
const STATE_LABEL: Record<string, string> = {
  completed: 'Completed', results_published: 'Results published', partially_published: 'Some results pending', results_pending: 'Results pending',
}

function outcomeText(c: BundleCourse): string {
  if (c.outcome) return OUTCOME_LABEL[c.outcome] ?? c.outcome
  return 'Outcome not configured'
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs uppercase tracking-wider text-[var(--r-muted)]">{label}</p>
      <p className="text-3xl font-semibold mt-1 text-[var(--r-ink)]" style={SERIF}>{value}</p>
      {hint && <p className="text-xs text-[var(--r-muted)] mt-1">{hint}</p>}
    </div>
  )
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className={CARD}>
      <p className="font-medium text-[var(--r-ink)]">{title}</p>
      <p className="text-sm text-[var(--r-muted)] mt-1">{body}</p>
    </div>
  )
}

function distribution(courses: BundleCourse[]): { letter: string; count: number }[] {
  const m = new Map<string, number>()
  courses.forEach(c => {
    if (c.grade_letter) m.set(c.grade_letter, (m.get(c.grade_letter) ?? 0) + 1)
  })
  return Array.from(m.entries()).map(([letter, count]) => ({ letter, count })).sort((a, b) => a.letter.localeCompare(b.letter))
}

export function SemesterView({ bundle, termId, onTermChange }: { bundle: ResultsBundle; termId: string | null; onTermChange: (id: string) => void }) {
  const sems = bundle.semesters
  const sem = sems.find(s => s.term_id === termId) ?? sems[sems.length - 1] ?? null
  const dist = useMemo(() => distribution(sem ? sem.courses : []), [sem])
  if (!sem) return <Empty title="No semesters yet" body="Your semesters appear here once you are registered for courses." />

  const prev = [...sems].filter(s => s.ordinal < sem.ordinal && s.gpa !== null).pop() ?? null
  const delta = sem.gpa !== null && prev !== null && prev.gpa !== null ? sem.gpa - prev.gpa : null
  const maxCount = Math.max(1, ...dist.map(d => d.count))
  const scaleMax = sem.scale?.max_point ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label htmlFor="edux-sem" className="text-xs uppercase tracking-wider text-[var(--r-muted)]">Semester</label>
          <select
            id="edux-sem"
            className="block mt-1 rounded-lg border border-[var(--r-line)] bg-[var(--r-card)] text-[var(--r-ink)] px-3 py-2 text-sm"
            value={sem.term_id}
            onChange={e => onTermChange(e.target.value)}
          >
            {sems.map(s => <option key={s.term_id} value={s.term_id}>{s.term_name} · {s.session_name}</option>)}
          </select>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full border border-[var(--r-line)] text-[var(--r-muted)]">{STATE_LABEL[sem.state] ?? sem.state}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Semester GPA" value={fmt(sem.gpa)} hint={scaleMax ? `out of ${scaleMax.toFixed(1)}` : undefined} />
        <Stat label="Cumulative GPA" value={fmt(sem.cgpa_to_date)} hint="up to and including this semester" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Credits attempted</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{fmt(sem.credits_attempted, 0)}</p></div>
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Credits earned</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{fmt(sem.credits_earned, 0)}</p></div>
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Counted for GPA</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{fmt(sem.credits_counted_toward_cgpa, 0)}</p></div>
      </div>

      {sem.pending_courses > 0 && (
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)]">{sem.pending_courses} course(s) still waiting for published results</p>
          <ul className="mt-1 text-sm text-[var(--r-muted)] list-disc pl-5">
            {sem.pending.map((p, i) => <li key={i}>{p.code ?? '—'} · {p.name}</li>)}
          </ul>
        </div>
      )}

      <div className={CARD}>
        <p className="font-medium text-[var(--r-ink)] mb-2">Courses</p>
        {sem.courses.length === 0 && <p className="text-sm text-[var(--r-muted)]">No published results in this semester yet.</p>}
        {sem.courses.map(c => (
          <details key={c.subject_id} className="border-t border-[var(--r-line)] py-2">
            <summary className="flex items-center justify-between gap-3 cursor-pointer list-none">
              <span className="min-w-0 text-sm">
                <span className="font-medium text-[var(--r-ink)]">{c.code ?? '—'}</span>
                <span className="text-[var(--r-muted)]"> · {c.name}</span>
              </span>
              <span className="shrink-0 text-sm text-[var(--r-ink)]">
                <b>{c.grade_letter ?? '—'}</b> <span className="text-[var(--r-muted)]">({fmt(c.grade_point, 1)})</span>
              </span>
            </summary>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
              <dt className="text-[var(--r-muted)]">Score</dt><dd className="text-[var(--r-ink)]">{fmt(c.total_score, 1)}</dd>
              <dt className="text-[var(--r-muted)]">Credit units</dt><dd className="text-[var(--r-ink)]">{fmt(c.credit_unit, 0)}</dd>
              <dt className="text-[var(--r-muted)]">Quality points</dt><dd className="text-[var(--r-ink)]">{fmt(c.quality_points, 1)}</dd>
              <dt className="text-[var(--r-muted)]">Outcome</dt><dd className="text-[var(--r-ink)]">{outcomeText(c)}</dd>
              <dt className="text-[var(--r-muted)]">Credits earned</dt><dd className="text-[var(--r-ink)]">{fmt(c.credits_earned, 0)}</dd>
              {c.is_repeat && (<><dt className="text-[var(--r-muted)]">Attempt</dt><dd className="text-[var(--r-ink)]">Attempt {c.attempt_number} of this course</dd></>)}
            </dl>
          </details>
        ))}
      </div>

      {dist.length > 0 && (
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)] mb-2">Grade distribution</p>
          <ul className="space-y-1.5">
            {dist.map(d => (
              <li key={d.letter} className="flex items-center gap-3 text-sm">
                <span className="w-6 font-semibold text-[var(--r-ink)]">{d.letter}</span>
                <span className="flex-1 h-2 rounded bg-[var(--r-line)]">
                  <span className="block h-2 rounded bg-[var(--r-accent)]" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </span>
                <span className="w-24 text-right text-[var(--r-muted)]">{d.count} course{d.count === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {delta !== null && prev !== null && (
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)]">Compared with {prev.term_name}</p>
          <p className="text-sm text-[var(--r-muted)] mt-1">
            {Math.abs(delta) < 0.005
              ? `Your semester GPA is unchanged at ${fmt(sem.gpa)}.`
              : delta > 0
                ? `Your semester GPA rose by ${delta.toFixed(2)}, from ${fmt(prev.gpa)} to ${fmt(sem.gpa)}.`
                : `Your semester GPA is ${Math.abs(delta).toFixed(2)} lower than last time (${fmt(prev.gpa)} to ${fmt(sem.gpa)}). One semester does not define your record, and your cumulative GPA is ${fmt(sem.cgpa_to_date)}.`}
          </p>
        </div>
      )}

      <div className={CARD}>
        <p className="font-medium text-[var(--r-ink)]">How this GPA is calculated</p>
        <p className="text-sm text-[var(--r-muted)] mt-1">Semester GPA is total quality points divided by the credit units counted. Quality points are the grade point multiplied by the credit units of each course.</p>
        <p className="font-mono text-sm text-[var(--r-ink)] mt-2">{fmt(sem.quality_points, 1)} ÷ {fmt(sem.credits_counted_toward_cgpa, 0)} = {fmt(sem.gpa)}</p>
        <p className="text-xs text-[var(--r-muted)] mt-2">{bundle.rules.gpa_rule}</p>
      </div>
    </div>
  )
}

export function YearView({ bundle, sessionId, onSessionChange }: { bundle: ResultsBundle; sessionId: string | null; onSessionChange: (id: string) => void }) {
  const years = bundle.years.filter(y => y.published_courses > 0)
  const year = years.find(y => y.session_id === sessionId) ?? years[years.length - 1] ?? null
  if (!year) return <Empty title="No academic year results yet" body="Your year summary appears once results are published." />

  const t = bundle.totals
  const chartMax = t.cgpa_scale_max ?? Math.max(1, ...year.semesters.map(s => s.gpa ?? 0))
  const pct = t.credits_required ? Math.min(100, Math.round((t.credits_earned / t.credits_required) * 100)) : null
  const barW = 56
  const gap = 24
  const width = Math.max(240, year.semesters.length * (barW + gap) + gap)

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="edux-year" className="text-xs uppercase tracking-wider text-[var(--r-muted)]">Academic year</label>
        <select
          id="edux-year"
          className="block mt-1 rounded-lg border border-[var(--r-line)] bg-[var(--r-card)] text-[var(--r-ink)] px-3 py-2 text-sm"
          value={year.session_id}
          onChange={e => onSessionChange(e.target.value)}
        >
          {years.map(y => <option key={y.session_id} value={y.session_id}>{y.session_name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Year GPA" value={fmt(year.gpa)} hint="from course credits, not an average of semester GPAs" />
        <Stat label="Cumulative GPA" value={fmt(year.cgpa_at_end)} hint="at the end of this year" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Credits attempted</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{fmt(year.credits_attempted, 0)}</p></div>
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Credits earned</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{fmt(year.credits_earned, 0)}</p></div>
        <div className={CARD}><p className="text-xs text-[var(--r-muted)]">Courses</p><p className="text-xl font-semibold text-[var(--r-ink)]" style={SERIF}>{year.published_courses}</p></div>
      </div>

      <div className={CARD}>
        <p className="font-medium text-[var(--r-ink)] mb-2">Semester GPA this year</p>
        <svg viewBox={`0 0 ${width} 140`} className="w-full max-w-md" role="img" aria-label="Bar chart of semester GPA for the selected year">
          {year.semesters.map((s, i) => {
            const h = s.gpa !== null ? (s.gpa / chartMax) * 90 : 0
            const x = gap + i * (barW + gap)
            return (
              <g key={s.term_id}>
                <rect x={x} y={100 - h} width={barW} height={h} rx={6} fill="var(--r-accent)" />
                <text x={x + barW / 2} y={94 - h} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--r-ink)">{s.gpa !== null ? s.gpa.toFixed(2) : '—'}</text>
                <text x={x + barW / 2} y={120} textAnchor="middle" fontSize="10" fill="var(--r-muted)">{s.term_name.length > 11 ? s.term_name.slice(0, 10) + '…' : s.term_name}</text>
              </g>
            )
          })}
        </svg>
        <table className="w-full text-sm mt-2">
          <thead><tr className="text-left text-xs text-[var(--r-muted)]"><th className="py-1">Semester</th><th>GPA</th><th>Credits</th></tr></thead>
          <tbody>
            {year.semesters.map(s => (
              <tr key={s.term_id} className="border-t border-[var(--r-line)] text-[var(--r-ink)]">
                <td className="py-1">{s.term_name}</td><td>{fmt(s.gpa)}</td><td>{fmt(s.credits_attempted, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={CARD}>
        <p className="font-medium text-[var(--r-ink)]">Progress against your programme</p>
        {t.credits_required ? (
          <>
            <div className="h-2 rounded bg-[var(--r-line)] mt-2" role="progressbar" aria-valuemin={0} aria-valuemax={t.credits_required} aria-valuenow={t.credits_earned} aria-label="Credits earned toward the programme requirement">
              <div className="h-2 rounded bg-[var(--r-accent)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-[var(--r-muted)] mt-2">{fmt(t.credits_earned, 0)} of {t.credits_required} credits earned so far. {fmt(t.credits_remaining, 0)} remaining. Repeated courses are counted once.</p>
          </>
        ) : (
          <p className="text-sm text-[var(--r-muted)] mt-1">Your programme credit requirement has not been configured by your institution yet.</p>
        )}
      </div>
    </div>
  )
}

export function FinalView({ bundle }: { bundle: ResultsBundle }) {
  const approved = bundle.final_state === 'graduation_approved' && bundle.graduation !== null
  const t = bundle.totals
  const revealTarget = approved ? (bundle.graduation?.final_cgpa ?? t.cgpa) : null
  const revealCgpa = useCountUp(revealTarget)
  const lastSem = [...bundle.semesters].reverse().find(s => s.gpa !== null) ?? null
  const p = bundle.profile

  if (!approved) {
    const pct = t.credits_required ? Math.min(100, Math.round((t.credits_earned / t.credits_required) * 100)) : null
    return (
      <div className="space-y-4">
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)]">Your journey so far</p>
          <p className="text-sm text-[var(--r-muted)] mt-1">
            Your final results appear here once your institution has recorded the approval of your programme completion. Until then this page shows your progress.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Cumulative GPA" value={fmt(t.cgpa)} hint={t.cgpa_scale_max ? `out of ${t.cgpa_scale_max.toFixed(1)}` : undefined} />
          <Stat label="Credits earned" value={fmt(t.credits_earned, 0)} hint={t.credits_required ? `of ${t.credits_required} required` : 'requirement not configured'} />
          <Stat label="Semesters completed" value={String(t.semesters_completed)} hint={`${t.semesters_with_results} with published results`} />
          <Stat label="Last semester GPA" value={fmt(lastSem?.gpa)} hint={lastSem ? lastSem.term_name : undefined} />
        </div>
        {pct !== null && (
          <div className={CARD}>
            <div className="h-2 rounded bg-[var(--r-line)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Programme credit progress">
              <div className="h-2 rounded bg-[var(--r-accent)]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-sm text-[var(--r-muted)] mt-2">{pct}% of the credit requirement earned.</p>
          </div>
        )}
      </div>
    )
  }

  const g = bundle.graduation
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-6 md:p-8 text-center border-2" style={{ borderColor: 'var(--r-gold)', background: 'var(--r-card)' }}>
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--r-muted)]">Programme completion approved</p>
        <p className="mt-3 text-sm text-[var(--r-muted)]">Final cumulative GPA</p>
        <p className="text-6xl font-semibold text-[var(--r-ink)]" style={SERIF}>{revealCgpa}</p>
        {g?.classification && <p className="mt-3 text-lg text-[var(--r-ink)]" style={SERIF}>{g.classification}</p>}
        <p className="mt-2 text-xs text-[var(--r-muted)]">
          As recorded by {bundle.institution.name}{g?.graduation_session ? ` for ${g.graduation_session}` : ''}.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Credits earned" value={fmt(t.credits_earned, 0)} />
        <Stat label="Semesters completed" value={String(t.semesters_completed)} />
        <Stat label="Last semester GPA" value={fmt(lastSem?.gpa)} hint="shown separately from the final CGPA" />
        <Stat label="Courses" value={String(t.courses_published)} />
      </div>
      <div className={CARD}>
        <p className="text-sm text-[var(--r-ink)]">{p.programme_name}{p.degree_type ? ` (${p.degree_type})` : ''}</p>
        <p className="text-sm text-[var(--r-muted)]">{p.department_name} · {p.faculty_name}</p>
      </div>
    </div>
  )
}