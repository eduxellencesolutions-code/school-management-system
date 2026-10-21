// FILE: src/components/results/ShareCardDialog.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { saveAs } from 'file-saver'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { recordExport } from '@/lib/results/statementExports'
import type { ResultsBundle } from '@/lib/results/bundleTypes'

type HeadlineKey = 'journey' | 'semesters' | 'credits' | 'approved'

interface CardOptions {
  showName: boolean
  showProgramme: boolean
  showLevel: boolean
  showCgpa: boolean
  showCredits: boolean
  showClassification: boolean
  showMatric: boolean
  headline: HeadlineKey
}

const SERIF = 'Georgia, "Times New Roman", serif'
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif'

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function headlineText(b: ResultsBundle, key: HeadlineKey): string {
  const t = b.totals
  if (key === 'approved') return 'Programme completion approved'
  if (key === 'semesters') return `${t.semesters_completed} semester${t.semesters_completed === 1 ? '' : 's'} completed`
  if (key === 'credits') return `${Math.round(t.credits_earned)} credits earned`
  return 'My academic journey'
}

function cardCgpa(b: ResultsBundle): number | null {
  if (b.final_state === 'graduation_approved' && b.graduation?.final_cgpa != null) return b.graduation.final_cgpa
  return b.totals.cgpa
}

function drawCard(canvas: HTMLCanvasElement, b: ResultsBundle, o: CardOptions) {
  const W = 1080
  const H = 1350
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, '#153a88')
  g.addColorStop(1, '#1C6EF2')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
  ctx.globalAlpha = 0.08
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.arc(W - 120, 160, 260, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  const left = 90
  const maxW = W - left * 2
  let y = 120
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.font = `600 28px ${SANS}`
  ctx.fillText('EDUXELLENCE RESULTS', left, y)
  y += 40
  ctx.fillStyle = '#E3B341'
  ctx.fillRect(left, y, 120, 6)
  y += 90

  ctx.fillStyle = '#FFFFFF'
  ctx.font = `700 54px ${SERIF}`
  for (const ln of wrapLines(ctx, b.institution.name, maxW).slice(0, 2)) {
    ctx.fillText(ln, left, y)
    y += 64
  }
  y += 30

  ctx.font = `700 76px ${SERIF}`
  for (const ln of wrapLines(ctx, headlineText(b, o.headline), maxW).slice(0, 3)) {
    ctx.fillText(ln, left, y)
    y += 88
  }
  y += 20

  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  if (o.showName) {
    ctx.font = `600 48px ${SERIF}`
    ctx.fillText(`${b.profile.first_name} ${b.profile.last_name}`.slice(0, 40), left, y)
    y += 56
  }
  ctx.font = `400 36px ${SANS}`
  if (o.showProgramme) {
    for (const ln of wrapLines(ctx, b.profile.programme_name, maxW).slice(0, 2)) {
      ctx.fillText(ln, left, y)
      y += 44
    }
  }
  if (o.showLevel && b.profile.current_level) {
    ctx.fillText(`Level ${b.profile.current_level}`, left, y)
    y += 44
  }
  if (o.showClassification && b.graduation?.classification) {
    ctx.font = `italic 600 44px ${SERIF}`
    ctx.fillText(b.graduation.classification.slice(0, 60), left, y)
    y += 54
  }
  const cgpa = cardCgpa(b)
  if (o.showCgpa && cgpa !== null) {
    y += 20
    ctx.fillStyle = '#FFFFFF'
    ctx.font = `700 150px ${SERIF}`
    ctx.fillText(cgpa.toFixed(2), left, y + 110)
    ctx.font = `400 34px ${SANS}`
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    const scale = b.totals.cgpa_scale_max ? ` out of ${b.totals.cgpa_scale_max.toFixed(1)}` : ''
    ctx.fillText(`Cumulative GPA${scale}`, left, y + 160)
    y += 190
  }
  ctx.font = `400 36px ${SANS}`
  ctx.fillStyle = 'rgba(255,255,255,0.92)'
  if (o.showCredits) {
    ctx.fillText(`${Math.round(b.totals.credits_earned)} credits earned`, left, y)
    y += 44
  }
  if (o.showMatric) {
    ctx.font = `400 30px ${SANS}`
    ctx.fillText(`Matric: ${b.profile.admission_number}`, left, y)
  }

  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `400 26px ${SANS}`
  ctx.fillText('A personal summary of published results.', left, H - 90)
  ctx.fillText('Not an official record.', left, H - 56)
}

function describe(b: ResultsBundle, o: CardOptions): string {
  const parts = [`Share card from ${b.institution.name}`, headlineText(b, o.headline)]
  if (o.showName) parts.push('with your name')
  if (o.showProgramme) parts.push('with your programme')
  if (o.showLevel) parts.push('with your level')
  if (o.showCgpa) parts.push('with your cumulative GPA')
  if (o.showCredits) parts.push('with credits earned')
  if (o.showClassification) parts.push('with the recorded classification')
  if (o.showMatric) parts.push('with your matriculation number')
  return parts.join(', ')
}

export default function ShareCardDialog({ bundle, onClose }: { bundle: ResultsBundle; onClose: () => void }) {
  const supabase = useMemo(() => createClient(), [])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const approved = bundle.final_state === 'graduation_approved'
  const [busy, setBusy] = useState(false)
  const [o, setO] = useState<CardOptions>({
    showName: false, showProgramme: false, showLevel: false, showCgpa: false, showCredits: false, showClassification: false, showMatric: false,
    headline: approved ? 'approved' : bundle.totals.semesters_completed > 0 ? 'semesters' : 'journey',
  })

  const headlines = useMemo(() => {
    const list: { key: HeadlineKey; label: string }[] = [{ key: 'journey', label: 'My academic journey' }]
    if (bundle.totals.semesters_completed > 0) list.push({ key: 'semesters', label: headlineText(bundle, 'semesters') })
    if (bundle.totals.credits_earned > 0) list.push({ key: 'credits', label: headlineText(bundle, 'credits') })
    if (approved) list.push({ key: 'approved', label: 'Programme completion approved' })
    return list
  }, [bundle, approved])

  useEffect(() => {
    if (canvasRef.current) drawCard(canvasRef.current, bundle, o)
  }, [bundle, o])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function setFlag(k: keyof Omit<CardOptions, 'headline'>, v: boolean) {
    setO(prev => ({ ...prev, [k]: v }))
  }

  function chosenFields(): string[] {
    return (['showName', 'showProgramme', 'showLevel', 'showCgpa', 'showCredits', 'showClassification', 'showMatric'] as const).filter(k => o[k])
  }

  async function makeBlob(): Promise<Blob> {
    const canvas = canvasRef.current
    if (!canvas) throw new Error('The preview is not ready')
    await recordExport(supabase, bundle.profile.learner_id, 'share_card', { fields: chosenFields(), headline: o.headline })
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('The image could not be created'))), 'image/png')
    })
  }

  async function save() {
    setBusy(true)
    try {
      saveAs(await makeBlob(), 'my-academic-summary.png')
      toast.success('Image saved')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setBusy(true)
    try {
      const file = new File([await makeBlob()], 'my-academic-summary.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })
      else saveAs(file, 'my-academic-summary.png')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
  const row = 'flex items-start gap-2 text-sm text-ink'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-labelledby="edux-share-title">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-4 md:p-6 grid md:grid-cols-2 gap-5">
        <div className="md:col-span-2 flex items-start justify-between gap-3">
          <div>
            <h2 id="edux-share-title" className="text-lg font-semibold text-ink">Create a share card</h2>
            <p className="text-sm text-ink-muted">Choose what goes on the image. Nothing is shared until you save it and post it yourself.</p>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="p-1.5 rounded hover:bg-surface-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs uppercase tracking-wider text-ink-muted mb-1">Headline</legend>
          {headlines.map(h => (
            <label key={h.key} className={row}>
              <input type="radio" name="edux-headline" checked={o.headline === h.key} onChange={() => setO(prev => ({ ...prev, headline: h.key }))} />
              {h.label}
            </label>
          ))}
          <legend className="text-xs uppercase tracking-wider text-ink-muted mt-4 mb-1">Also show (all off by default)</legend>
          <label className={row}><input type="checkbox" checked={o.showName} onChange={e => setFlag('showName', e.target.checked)} /> My name</label>
          <label className={row}><input type="checkbox" checked={o.showProgramme} onChange={e => setFlag('showProgramme', e.target.checked)} /> My programme</label>
          <label className={row}><input type="checkbox" checked={o.showLevel} onChange={e => setFlag('showLevel', e.target.checked)} /> My level</label>
          <label className={row}><input type="checkbox" checked={o.showCgpa} onChange={e => setFlag('showCgpa', e.target.checked)} /> My cumulative GPA</label>
          <label className={row}><input type="checkbox" checked={o.showCredits} onChange={e => setFlag('showCredits', e.target.checked)} /> Credits earned</label>
          {approved && bundle.graduation?.classification && (
            <label className={row}><input type="checkbox" checked={o.showClassification} onChange={e => setFlag('showClassification', e.target.checked)} /> The classification recorded by my institution</label>
          )}
          <label className={row}>
            <input type="checkbox" checked={o.showMatric} onChange={e => setFlag('showMatric', e.target.checked)} />
            <span>My matriculation number <span className="text-amber-700">(not recommended: it identifies you to anyone who sees the image)</span></span>
          </label>
          <p className="text-xs text-ink-muted pt-2">Course results, your photo, your date of birth and any private details can never be added.</p>
        </fieldset>

        <div>
          <canvas ref={canvasRef} role="img" aria-label={describe(bundle, o)} className="w-full max-w-[360px] mx-auto rounded-xl border border-surface-200 block" style={{ height: 'auto' }} />
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <button type="button" className="btn-primary btn btn-sm" disabled={busy} onClick={() => void save()}>Save image</button>
            {canShare && <button type="button" className="btn-secondary btn btn-sm" disabled={busy} onClick={() => void share()}>Share…</button>}
          </div>
        </div>
      </div>
    </div>
  )
}