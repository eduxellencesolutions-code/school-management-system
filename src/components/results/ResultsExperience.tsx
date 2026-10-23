// FILE: src/components/results/ResultsExperience.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Eye, EyeOff, Download, FileSpreadsheet, Share2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import JourneyLine from './JourneyLine'
import ShareCardDialog from './ShareCardDialog'
import AttemptHistory from './AttemptHistory'
import { SemesterView, YearView, FinalView, CARD, fmt } from './Views'
import { useCountUp } from './useCountUp'
import { downloadStatementPdf, downloadStatementXlsx, recordExport } from '@/lib/results/statementExports'
import type { ResultsBundle } from '@/lib/results/bundleTypes'

type View = 'semester' | 'year' | 'final'
type Theme = 'auto' | 'light' | 'dark'

const SERIF = { fontFamily: 'Georgia, "Times New Roman", serif' } as const

const THEME_CSS = `
.edux-results{--r-bg:#F7F6F2;--r-card:#FFFFFF;--r-ink:#0D1117;--r-muted:#5A6472;--r-line:#E2DED5;--r-accent:#1C6EF2;--r-accent-ink:#FFFFFF;--r-gold:#B8860B}
.edux-results[data-theme="dark"]{--r-bg:#0D1117;--r-card:#161B22;--r-ink:#E6EDF3;--r-muted:#9AA7B4;--r-line:#2B323B;--r-accent:#6FA0FF;--r-accent-ink:#0D1117;--r-gold:#E3B341}
@media (prefers-color-scheme: dark){.edux-results[data-theme="auto"]{--r-bg:#0D1117;--r-card:#161B22;--r-ink:#E6EDF3;--r-muted:#9AA7B4;--r-line:#2B323B;--r-accent:#6FA0FF;--r-accent-ink:#0D1117;--r-gold:#E3B341}}
.edux-results details>summary::-webkit-details-marker{display:none}
`

const TABS: { id: View; label: string }[] = [
  { id: 'semester', label: 'Semester' },
  { id: 'year', label: 'Year' },
  { id: 'final', label: 'Final' },
]

function maskMatric(m: string): string {
  if (m.length <= 4) return '••••'
  return m.slice(0, 2) + '•'.repeat(Math.max(m.length - 5, 2)) + m.slice(-3)
}

function buildInsights(b: ResultsBundle): string[] {
  const out: string[] = []
  const all = b.semesters.flatMap(s => s.courses)
  const graded = all.filter(c => c.grade_point !== null)
  if (graded.length > 0) {
    const best = graded.reduce((a, c) => {
      const ap = a.grade_point as number
      const cp = c.grade_point as number
      return cp > ap || (cp === ap && (c.total_score ?? 0) > (a.total_score ?? 0)) ? c : a
    })
    out.push(`Your strongest result so far is ${best.code ?? best.name} (${best.name}) with grade ${best.grade_letter}.`)
  }
  const withGpa = b.semesters.filter(s => s.gpa !== null)
  if (withGpa.length >= 2) {
    const prev = withGpa[withGpa.length - 2]
    const last = withGpa[withGpa.length - 1]
    const d = (last.gpa as number) - (prev.gpa as number)
    if (Math.abs(d) >= 0.005) {
      out.push(d > 0
        ? `Your latest semester GPA is ${d.toFixed(2)} higher than the one before.`
        : `Your latest semester GPA is ${Math.abs(d).toFixed(2)} lower than the one before. Looking at the course list can help you plan the next semester.`)
    }
  }
  const fails = graded.filter(c => c.outcome === 'fail')
  if (fails.length > 0) {
    out.push(`${fails.length} course result(s) carry a fail outcome. Your institution's regulations decide what happens next, so please check with your department.`)
  }
  if (b.totals.outcomes_not_configured > 0) {
    out.push(`${b.totals.outcomes_not_configured} result(s) do not have a configured outcome yet, so they are not counted as earned credits until your institution sets it.`)
  }
  if (b.totals.repeat_attempts > 0) {
    out.push('Repeated courses are shown with their attempt number. Credits for a repeated course are counted once.')
  }
  return out
}

function Hero({ bundle, showMatric, onToggleMatric }: { bundle: ResultsBundle; showMatric: boolean; onToggleMatric: () => void }) {
  const p = bundle.profile
  const t = bundle.totals
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])
  const cgpaText = useCountUp(t.cgpa)
  const max = t.cgpa_scale_max
  const frac = t.cgpa !== null && max ? Math.min(1, t.cgpa / max) : 0
  const R = 54
  const C = 2 * Math.PI * R
  const initials = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase()
  const pct = t.credits_required ? Math.min(100, Math.round((t.credits_earned / t.credits_required) * 100)) : null
  const standing = bundle.final_state === 'graduation_approved' ? 'Graduation approved' : (p.academic_status ?? 'Student')

  return (
    <section className={`${CARD} flex flex-col md:flex-row gap-5 md:items-center`} aria-label="Academic standing">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {p.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.photo_url} alt={`${p.first_name} ${p.last_name}`} className="w-16 h-16 rounded-full object-cover border border-[var(--r-line)]" />
        ) : (
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold border border-[var(--r-line)] text-[var(--r-ink)]" style={SERIF} aria-hidden="true">{initials}</div>
        )}
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-[var(--r-muted)]">{bundle.institution.name}</p>
          <h1 className="text-xl md:text-2xl font-semibold text-[var(--r-ink)] truncate" style={SERIF}>{p.first_name} {p.last_name}</h1>
          <p className="text-sm text-[var(--r-muted)]">{p.programme_name}{p.current_level ? ` · Level ${p.current_level}` : ''}</p>
          <p className="text-sm text-[var(--r-muted)]">{p.department_name} · {p.faculty_name}</p>
          <p className="text-xs text-[var(--r-muted)] mt-1 flex items-center gap-1.5">
            <span>Matric: {showMatric ? p.admission_number : maskMatric(p.admission_number)}</span>
            <button type="button" onClick={onToggleMatric} className="inline-flex items-center gap-1 underline" aria-pressed={showMatric}>
              {showMatric ? <EyeOff size={12} /> : <Eye size={12} />}{showMatric ? 'Hide' : 'Show'}
            </button>
          </p>
          <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full border border-[var(--r-line)] text-[var(--r-muted)]">{standing}</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative w-[132px] h-[132px] shrink-0">
          <svg width="132" height="132" viewBox="0 0 132 132" role="img" aria-label={t.cgpa !== null ? `Cumulative GPA ${t.cgpa.toFixed(2)}${max ? ` out of ${max.toFixed(1)}` : ''}` : 'Cumulative GPA not available yet'}>
            <circle cx="66" cy="66" r={R} fill="none" stroke="var(--r-line)" strokeWidth="10" />
            <circle
              cx="66" cy="66" r={R} fill="none" stroke="var(--r-accent)" strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${C * (mounted ? frac : 0)} ${C}`} transform="rotate(-90 66 66)"
              style={{ transition: 'stroke-dasharray 900ms ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-semibold text-[var(--r-ink)]" style={SERIF}>{cgpaText}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--r-muted)]">CGPA{max ? ` / ${max.toFixed(1)}` : ''}</span>
          </div>
        </div>
        <div className="text-sm space-y-1.5 min-w-[9rem]">
          <p className="text-[var(--r-ink)]"><b style={SERIF} className="text-xl">{fmt(t.credits_earned, 0)}</b> <span className="text-[var(--r-muted)]">credits earned</span></p>
          <p className="text-[var(--r-muted)]">{t.semesters_completed} semester(s) completed</p>
          {pct !== null ? (
            <>
              <div className="h-1.5 rounded bg-[var(--r-line)]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Credits earned toward the programme requirement">
                <div className="h-1.5 rounded bg-[var(--r-accent)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[var(--r-muted)]">{pct}% of {t.credits_required} required</p>
            </>
          ) : (
            <p className="text-xs text-[var(--r-muted)]">Credit requirement not configured</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default function ResultsExperience({ learnerId }: { learnerId?: string }) {
  const supabase = useMemo(() => createClient(), [])
  const [bundle, setBundle] = useState<ResultsBundle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('semester')
  const [termId, setTermId] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('auto')
  const [showMatric, setShowMatric] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('edux-results-theme')
      if (saved === 'light' || saved === 'dark' || saved === 'auto') setTheme(saved)
    } catch {
      /* storage unavailable */
    }
  }, [])

  function chooseTheme(t: Theme) {
    setTheme(t)
    try {
      window.localStorage.setItem('edux-results-theme', t)
    } catch {
      /* ignore */
    }
  }

  const focusOn = useCallback((b: ResultsBundle) => {
    const withResults = b.semesters.filter(s => s.published_courses > 0)
    const focus = withResults[withResults.length - 1] ?? b.semesters[b.semesters.length - 1] ?? null
    setTermId(focus?.term_id ?? null)
    setSessionId(focus?.session_id ?? null)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: rpcError } = learnerId
      ? await supabase.rpc('get_tertiary_results_bundle_for', { p_learner_id: learnerId })
      : await supabase.rpc('get_my_tertiary_results_bundle')
    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }
    const b = data as ResultsBundle
    setBundle(b)
    focusOn(b)
    setLoading(false)
  }, [supabase, learnerId, focusOn])

  useEffect(() => {
    void load()
  }, [load])

  const insights = useMemo(() => (bundle ? buildInsights(bundle) : []), [bundle])

  async function runExport(kind: 'statement_pdf' | 'statement_xlsx') {
    if (!bundle) return
    setBusy(kind)
    try {
      const exportId = await recordExport(supabase, bundle.profile.learner_id, kind)
      if (kind === 'statement_pdf') await downloadStatementPdf(bundle, exportId)
      else await downloadStatementXlsx(bundle, exportId)
      toast.success('Statement downloaded. It is marked unofficial.')
    } catch (e) {
      toast.error((e as Error).message || 'The statement could not be created')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="edux-results" data-theme={theme}>
        <style>{THEME_CSS}</style>
        <div className="p-6 flex items-center gap-2 text-sm text-ink-muted" role="status"><Loader2 size={16} className="animate-spin" /> Loading your results…</div>
      </div>
    )
  }

  if (error || !bundle) {
    return (
      <div className="edux-results" data-theme={theme}>
        <style>{THEME_CSS}</style>
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)]">The results could not be loaded</p>
          <p className="text-sm text-[var(--r-muted)] mt-1">{error ?? 'Something went wrong. Please try again.'}</p>
          <button type="button" onClick={() => void load()} className="mt-3 btn-primary btn btn-sm">Try again</button>
        </div>
      </div>
    )
  }

  const scaleMax = bundle.totals.cgpa_scale_max
  const hasPublished = bundle.semesters.some(s => s.published_courses > 0)

  return (
    <div className="edux-results rounded-3xl p-3 md:p-5 space-y-4" data-theme={theme} style={{ background: 'var(--r-bg)' }}>
      <style>{THEME_CSS}</style>

      <div className="flex justify-end gap-1 text-xs" role="group" aria-label="Colour theme">
        {(['auto', 'light', 'dark'] as Theme[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => chooseTheme(t)}
            aria-pressed={theme === t}
            className={`px-2.5 py-1 rounded-full border border-[var(--r-line)] ${theme === t ? 'bg-[var(--r-accent)] text-[var(--r-accent-ink)]' : 'text-[var(--r-muted)]'}`}
          >
            {t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
          </button>
        ))}
      </div>

      <Hero bundle={bundle} showMatric={showMatric} onToggleMatric={() => setShowMatric(v => !v)} />

      {hasPublished && (
        <section className="flex flex-wrap items-center gap-2" aria-label="Statement and sharing">
          <button type="button" className="btn-secondary btn btn-sm" disabled={busy !== null} onClick={() => void runExport('statement_pdf')}>
            {busy === 'statement_pdf' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Statement (PDF)
          </button>
          <button type="button" className="btn-secondary btn btn-sm" disabled={busy !== null} onClick={() => void runExport('statement_xlsx')}>
            {busy === 'statement_xlsx' ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />} Statement (Excel)
          </button>
          <button type="button" className="btn-secondary btn btn-sm" disabled={busy !== null} onClick={() => setShareOpen(true)}>
            <Share2 size={14} /> Share card
          </button>
          <span className="text-xs text-[var(--r-muted)]">Statements are marked unofficial. Official transcripts are issued by your institution&apos;s registry.</span>
        </section>
      )}

      {bundle.semesters.length === 0 ? (
        <div className={CARD}>
          <p className="font-medium text-[var(--r-ink)]">No results yet</p>
          <p className="text-sm text-[var(--r-muted)] mt-1">When your institution publishes your results, your academic journey appears here.</p>
        </div>
      ) : (
        <>
          <section className={CARD} aria-label="Your academic journey">
            <p className="font-medium text-[var(--r-ink)] mb-1">Your academic journey</p>
            <JourneyLine
              semesters={bundle.semesters}
              selectedTermId={termId}
              scaleMax={scaleMax}
              onSelect={id => {
                setTermId(id)
                const s = bundle.semesters.find(x => x.term_id === id)
                if (s) setSessionId(s.session_id)
                setView('semester')
              }}
            />
          </section>

          {insights.length > 0 && (
            <section className={CARD} aria-label="Insights from the record">
              <p className="font-medium text-[var(--r-ink)] mb-1">From the record</p>
              <ul className="text-sm text-[var(--r-muted)] list-disc pl-5 space-y-1">
                {insights.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </section>
          )}

          <AttemptHistory learnerId={bundle.profile.learner_id} />
          <div className="hidden md:flex gap-2" role="tablist" aria-label="Results views">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={view === t.id}
                onClick={() => setView(t.id)}
                className={`px-4 py-2 rounded-full text-sm border border-[var(--r-line)] ${view === t.id ? 'bg-[var(--r-accent)] text-[var(--r-accent-ink)]' : 'text-[var(--r-ink)] bg-[var(--r-card)]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {view === 'semester' && <SemesterView bundle={bundle} termId={termId} onTermChange={setTermId} />}
            {view === 'year' && <YearView bundle={bundle} sessionId={sessionId} onSessionChange={setSessionId} />}
            {view === 'final' && <FinalView bundle={bundle} />}
          </div>

          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--r-line)] bg-[var(--r-card)] grid grid-cols-3" aria-label="Results views">
            {TABS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setView(t.id)}
                aria-current={view === t.id ? 'page' : undefined}
                className={`py-3 text-sm font-medium ${view === t.id ? 'text-[var(--r-accent)]' : 'text-[var(--r-muted)]'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </>
      )}

      {shareOpen && <ShareCardDialog bundle={bundle} onClose={() => setShareOpen(false)} />}
    </div>
  )
}