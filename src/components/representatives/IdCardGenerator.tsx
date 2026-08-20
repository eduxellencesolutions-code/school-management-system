'use client'
import { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import jsPDF from 'jspdf'
import { Loader2, Download, FileDown } from 'lucide-react'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const ir = img.width / img.height, tr = dw / dh
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (ir > tr) { sh = img.height; sw = sh * tr; sx = (img.width - sw) / 2 }
  else { sw = img.width; sh = sw / tr; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, dx: number, dy: number, dw: number, dh: number) {
  const ir = img.width / img.height, tr = dw / dh
  let w = dw, h = dh
  if (ir > tr) { h = dw / ir } else { w = dh * ir }
  ctx.drawImage(img, dx + (dw - w) / 2, dy + (dh - h) / 2, w, h)
}

const WIDTH = 1013, HEIGHT = 638

async function renderCard(data: any, qrDataUrl: string): Promise<HTMLCanvasElement> {
  const rep = data.representative
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'

  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT)
  bg.addColorStop(0, '#ffffff')
  bg.addColorStop(1, '#f4f6fb')
  roundRectPath(ctx, 0, 0, WIDTH, HEIGHT, 24)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = '#d8dee8'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.save()
  roundRectPath(ctx, 0, 0, WIDTH, HEIGHT, 24)
  ctx.clip()
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, WIDTH, 70)
  ctx.restore()

  if (data.logoUrl) {
    try {
      const logoImg = await loadImage(data.logoUrl)
      drawContain(ctx, logoImg, 16, 15, 40, 40)
    } catch {}
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = '700 26px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText('EDUXELLENCE', 70, 45)
  ctx.font = '400 18px system-ui, -apple-system, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.textAlign = 'right'
  ctx.fillText('Representative ID', WIDTH - 20, 45)
  ctx.textAlign = 'left'

  if (data.photoUrl) {
    try {
      const photoImg = await loadImage(data.photoUrl)
      ctx.save()
      roundRectPath(ctx, 30, 105, 180, 180, 16)
      ctx.clip()
      drawCover(ctx, photoImg, 30, 105, 180, 180)
      ctx.restore()
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 3
      roundRectPath(ctx, 30, 105, 180, 180, 16)
      ctx.stroke()
    } catch {}
  }

  ctx.fillStyle = '#111827'
  ctx.font = '700 30px system-ui, -apple-system, sans-serif'
  ctx.fillText(rep.fullName, 240, 140)
  ctx.fillStyle = '#6b7280'
  ctx.font = '400 20px system-ui, -apple-system, sans-serif'
  ctx.fillText(rep.designation, 240, 175)
  ctx.fillStyle = '#374151'
  ctx.font = '400 18px ui-monospace, monospace'
  ctx.fillText('ID: ' + rep.referralCode, 240, 215)

  roundRectPath(ctx, 240, 235, 200, 30, 15)
  ctx.fillStyle = '#ecfdf5'
  ctx.fill()
  ctx.fillStyle = '#059669'
  ctx.font = '600 16px system-ui, -apple-system, sans-serif'
  ctx.fillText(rep.status, 255, 256)

  try {
    const qrImg = await loadImage(qrDataUrl)
    const wasSmoothing = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrImg, WIDTH - 140, 100, 100, 100)
    ctx.imageSmoothingEnabled = wasSmoothing
  } catch {}

  ctx.fillStyle = '#9ca3af'
  ctx.font = '400 14px system-ui, -apple-system, sans-serif'
  ctx.fillText('Issued ' + (rep.issuedOn ? new Date(rep.issuedOn).toLocaleDateString('en-NG') : '—'), 30, HEIGHT - 20)

  return canvas
}

export default function IdCardGenerator({ apiUrl = '/api/representatives/id-card' }: { apiUrl?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    fetch(apiUrl).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [apiUrl])

  useEffect(() => {
    if (!data?.eligible || !qrRef.current) return
    const qrDataUrl = qrRef.current.toDataURL('image/png')
    renderCard(data, qrDataUrl).then(canvas => {
      canvasRef.current = canvas
      setPreviewUrl(canvas.toDataURL('image/png'))
    })
  }, [data])

  function downloadPng() {
    if (!canvasRef.current || !data) return
    const link = document.createElement('a')
    link.download = `eduxellence-id-${data.representative.referralCode}.png`
    link.href = canvasRef.current.toDataURL('image/png', 1.0)
    link.click()
  }

  function downloadPdf() {
    if (!canvasRef.current || !data) return
    setBusy(true)
    try {
      const imgData = canvasRef.current.toDataURL('image/png', 1.0)
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [3.375, 2.125] })
      pdf.addImage(imgData, 'PNG', 0, 0, 3.375, 2.125, undefined, 'FAST')
      pdf.save(`eduxellence-id-${data.representative.referralCode}.pdf`)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  if (!data?.eligible) {
    return (
      <div className="card p-6 max-w-md mx-auto text-center">
        <p className="font-semibold text-ink mb-2">ID Card unavailable</p>
        <p className="text-sm text-ink-muted mb-3">Your official Representative ID card cannot be generated yet.</p>
        <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 text-left space-y-1">
          {data?.missing?.map((m: string, i: number) => <li key={i}>• {m}</li>)}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ display: 'none' }}>
        <QRCodeCanvas ref={qrRef as any} value={data.verifyUrl} size={400} />
      </div>

      {previewUrl ? (
        <img
          src={previewUrl} alt="Representative ID Card"
          style={{ width: '337.5px', height: '212.5px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
        />
      ) : (
        <div style={{ width: '337.5px', height: '212.5px' }} className="flex items-center justify-center">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={downloadPng} disabled={!previewUrl} className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <Download size={14} /> Download PNG
        </button>
        <button onClick={downloadPdf} disabled={!previewUrl || busy} className="btn-primary btn-sm btn flex items-center gap-1.5">
          <FileDown size={14} /> {busy ? 'Preparing…' : 'Download PDF'}
        </button>
      </div>
      <p className="text-xs text-ink-faint text-center max-w-xs">
        The PDF is sized to a real ID card (3.375" × 2.125") for accurate printing.
      </p>
    </div>
  )
}