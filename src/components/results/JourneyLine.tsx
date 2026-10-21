// FILE: src/components/results/JourneyLine.tsx
'use client'

import { useMemo } from 'react'
import type { BundleSemester } from '@/lib/results/bundleTypes'

interface Props {
  semesters: BundleSemester[]
  selectedTermId: string | null
  onSelect: (termId: string) => void
  scaleMax: number | null
}

const STEP = 100
const PAD_X = 56
const HEIGHT = 200
const TOP = 36
const BOTTOM = 56

function band(gpa: number | null, scaleMax: number | null): string {
  if (gpa === null || !scaleMax) return '#8A9BAC'
  const ratio = gpa / scaleMax
  if (ratio >= 0.8) return '#15803d'
  if (ratio >= 0.6) return '#1558d4'
  if (ratio >= 0.4) return '#b45309'
  return '#b91c1c'
}

function shortName(name: string): string {
  return name.length > 13 ? name.slice(0, 12) + '…' : name
}

export default function JourneyLine({ semesters, selectedTermId, onSelect, scaleMax }: Props) {
  const geo = useMemo(() => {
    const n = semesters.length
    const width = Math.max(320, PAD_X * 2 + Math.max(0, n - 1) * STEP)
    const values = semesters.map(s => s.cgpa_to_date).filter((v): v is number => v !== null)
    const hi = scaleMax ?? (values.length ? Math.max(...values) : 1)
    const lo = scaleMax ? 0 : values.length ? Math.min(...values) : 0
    const span = hi - lo || 1
    const plotH = HEIGHT - TOP - BOTTOM
    const yFor = (v: number) => TOP + (1 - (v - lo) / span) * plotH
    const nodes = semesters.map((s, i) => {
      const hasResults = s.published_courses > 0 && s.cgpa_to_date !== null
      return {
        s,
        x: n === 1 ? width / 2 : PAD_X + i * STEP,
        y: hasResults ? yFor(s.cgpa_to_date as number) : HEIGHT - BOTTOM + 6,
        r: s.published_courses > 0 ? Math.min(22, Math.max(9, 8 + s.credits_attempted * 0.8)) : 9,
        hasResults,
      }
    })
    const solid = nodes.filter(nd => nd.hasResults)
    const path = solid.map((nd, i) => `${i === 0 ? 'M' : 'L'} ${nd.x.toFixed(1)} ${nd.y.toFixed(1)}`).join(' ')
    const seps: number[] = []
    const labels: { x: number; text: string }[] = []
    nodes.forEach((nd, i) => {
      if (i === 0 || nd.s.session_id !== nodes[i - 1].s.session_id) {
        labels.push({ x: nd.x - 40, text: nd.s.session_name })
        if (i > 0) seps.push(nd.x - STEP / 2)
      }
    })
    return { width, nodes, path, seps, labels, drawLine: solid.length > 1 }
  }, [semesters, scaleMax])

  const legend: [string, string][] = [
    ['#15803d', '80% or more of the scale maximum'],
    ['#1558d4', '60 to 79%'],
    ['#b45309', '40 to 59%'],
    ['#b91c1c', 'below 40%'],
  ]

  return (
    <div>
      <div className="overflow-x-auto pb-2" role="group" aria-label="Academic journey. One node per semester. Select a node to open that semester.">
        <svg width={geo.width} height={HEIGHT} viewBox={`0 0 ${geo.width} ${HEIGHT}`} className="block">
          <style>{`.edux-node{outline:none;cursor:pointer}.edux-node:focus-visible>circle:first-of-type{stroke:var(--r-accent);stroke-width:3}@media (prefers-reduced-motion: no-preference){.edux-path{stroke-dasharray:1;stroke-dashoffset:1;animation:edux-draw 1.4s ease-out .2s forwards}@keyframes edux-draw{to{stroke-dashoffset:0}}}`}</style>
          {geo.seps.map(x => (
            <line key={x} x1={x} x2={x} y1={20} y2={HEIGHT - 12} stroke="var(--r-line)" strokeDasharray="4 4" />
          ))}
          {geo.labels.map(l => (
            <text key={l.text + l.x} x={Math.max(4, l.x)} y={14} fontSize="11" fill="var(--r-muted)">{l.text}</text>
          ))}
          {geo.drawLine && (
            <path className="edux-path" d={geo.path} pathLength={1} fill="none" stroke="var(--r-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {geo.nodes.map(({ s, x, y, r, hasResults }) => {
            const selected = s.term_id === selectedTermId
            const label = hasResults
              ? `${s.term_name}, ${s.session_name}: semester GPA ${s.gpa !== null ? s.gpa.toFixed(2) : 'not available'}, ${s.credits_attempted} credits`
              : `${s.term_name}, ${s.session_name}: results pending`
            return (
              <g
                key={s.term_id}
                className="edux-node"
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => onSelect(s.term_id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(s.term_id)
                  }
                }}
              >
                <circle cx={x} cy={y} r={r + 5} fill="transparent" stroke={selected ? 'var(--r-accent)' : 'transparent'} strokeWidth="2" />
                <circle
                  cx={x} cy={y} r={r}
                  fill={hasResults ? band(s.gpa, scaleMax) : 'var(--r-card)'}
                  stroke={hasResults ? 'var(--r-card)' : 'var(--r-muted)'}
                  strokeWidth="2"
                  strokeDasharray={hasResults ? undefined : '3 3'}
                />
                <text x={x} y={HEIGHT - 26} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--r-ink)">
                  {hasResults ? (s.gpa !== null ? s.gpa.toFixed(2) : '—') : 'Pending'}
                </text>
                <text x={x} y={HEIGHT - 10} textAnchor="middle" fontSize="10" fill="var(--r-muted)">{shortName(s.term_name)}</text>
              </g>
            )
          })}
        </svg>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--r-muted)] mt-1">
        {scaleMax ? legend.map(([c, t]) => (
          <li key={t} className="flex items-center gap-1">
            <span aria-hidden="true" className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {t}
          </li>
        )) : <li>Fill is neutral because the grading scales of these semesters differ.</li>}
        <li>Node size shows credits. A dashed node means results are pending. The line shows your cumulative GPA.</li>
      </ul>

      <table className="sr-only">
        <caption>Semester results summary</caption>
        <thead><tr><th>Semester</th><th>Session</th><th>Semester GPA</th><th>Cumulative GPA</th><th>Credits</th></tr></thead>
        <tbody>
          {semesters.map(s => (
            <tr key={s.term_id}>
              <td>{s.term_name}</td><td>{s.session_name}</td>
              <td>{s.gpa !== null ? s.gpa.toFixed(2) : 'Pending'}</td>
              <td>{s.cgpa_to_date !== null ? s.cgpa_to_date.toFixed(2) : 'Pending'}</td>
              <td>{s.credits_attempted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}