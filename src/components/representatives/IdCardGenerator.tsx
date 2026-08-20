'use client'
import { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import jsPDF from 'jspdf'
import { Loader2, Download, FileDown } from 'lucide-react'

const NAVY = '#0B1F3A'
const BLUE = '#1464F4'
const GOLD = '#F4B400'
const BG_SOFT = '#F4F7FB'
const TEXT = '#172033'

const CARD_W_MM = 85.6
const CARD_H_MM = 53.98

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function cropToDataUrl(src: string, boxW: number, boxH: number, mode: 'cover' | 'contain'): Promise<string> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = boxW
  canvas.height = boxH
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'
  const ir = img.width / img.height, br = boxW / boxH
  if (mode === 'cover') {
    let sw = img.width, sh = img.height, sx = 0, sy = 0
    if (ir > br) { sh = img.height; sw = sh * br; sx = (img.width - sw) / 2 }
    else { sw = img.width; sh = sw / br; sy = (img.height - sh) / 2 }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, boxW, boxH)
  } else {
    let w = boxW, h = boxH
    if (ir > br) { h = boxW / ir } else { w = boxH * ir }
    ctx.drawImage(img, (boxW - w) / 2, (boxH - h) / 2, w, h)
  }
  return canvas.toDataURL('image/png')
}

function statusColor(status: string) {
  if (status === 'active') return { bg: '#ecfdf5', text: '#059669', label: 'ACTIVE' }
  if (status === 'suspended') return { bg: '#fffbeb', text: '#b45309', label: 'SUSPENDED' }
  return { bg: '#fef2f2', text: '#b91c1c', label: status.toUpperCase() }
}

const PX_PER_MM = 12
const CANVAS_W = Math.round(CARD_W_MM * PX_PER_MM)
const CANVAS_H = Math.round(CARD_H_MM * PX_PER_MM)

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 === 0 ? r : r * 0.45
    const x = cx + radius * Math.cos(angle), y = cy + radius * Math.sin(angle)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

async function renderFrontCanvas(data: any, qrDataUrl: string): Promise<HTMLCanvasElement> {
  const rep = data.representative
  const m = PX_PER_MM
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ;(ctx as any).imageSmoothingQuality = 'high'

  roundRectPath(ctx, 0, 0, CANVAS_W, CANVAS_H, 10 * m / 3.78)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.strokeStyle = '#d8dee8'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.save()
  roundRectPath(ctx, 0, 0, CANVAS_W, CANVAS_H, 10 * m / 3.78)
  ctx.clip()
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, CANVAS_W, 13 * m)
  ctx.restore()

  if (data.logoUrl) {
    try {
      const logoDataUrl = await cropToDataUrl(data.logoUrl, 8 * m, 8 * m, 'contain')
      const logoImg = await loadImage(logoDataUrl)
      ctx.drawImage(logoImg, 3 * m, 2.5 * m, 8 * m, 8 * m)
    } catch {}
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = (4.2 * m) + 'px Arial, sans-serif'
  ctx.font = '700 ' + ctx.font
  ctx.textAlign = 'left'
  ctx.fillText('EDUXELLENCE SOLUTIONS', 13 * m, 6.5 * m)
  ctx.fillStyle = GOLD
  ctx.font = '600 ' + (2.3 * m) + 'px Arial, sans-serif'
  ctx.fillText(rep.designation.toUpperCase(), 13 * m, 10.3 * m)

  const photoBox = { x: 3 * m, y: 16 * m, w: 24 * m, h: 30 * m }
  if (data.photoUrl) {
    try {
      const photoDataUrl = await cropToDataUrl(data.photoUrl, photoBox.w, photoBox.h, 'cover')
      const photoImg = await loadImage(photoDataUrl)
      ctx.save()
      roundRectPath(ctx, photoBox.x, photoBox.y, photoBox.w, photoBox.h, 2 * m)
      ctx.clip()
      ctx.drawImage(photoImg, photoBox.x, photoBox.y, photoBox.w, photoBox.h)
      ctx.restore()
    } catch {}
  }
  ctx.strokeStyle = BLUE
  ctx.lineWidth = 1.5
  roundRectPath(ctx, photoBox.x, photoBox.y, photoBox.w, photoBox.h, 2 * m)
  ctx.stroke()

  const infoX = 30 * m
  ctx.fillStyle = TEXT
  ctx.font = '700 ' + (4.6 * m) + 'px Arial, sans-serif'
  ctx.fillText(rep.fullName, infoX, 20 * m)

  ctx.font = '600 ' + (2.7 * m) + 'px Arial, sans-serif'
  ctx.fillStyle = '#4b5568'
  ctx.fillText('Rep ID: ' + rep.referralCode, infoX, 25 * m)

  const st = statusColor(rep.status)
  const pillW = 16 * m, pillH = 4 * m, pillY = 28 * m
  roundRectPath(ctx, infoX, pillY, pillW, pillH, pillH / 2)
  ctx.fillStyle = st.bg
  ctx.fill()
  ctx.fillStyle = st.text
  ctx.font = '700 ' + (2.2 * m) + 'px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(st.label, infoX + pillW / 2, pillY + pillH / 2 + 0.8 * m)
  ctx.textAlign = 'left'

  const badgeY = 34 * m
  const badgeText = data.badge.label.toUpperCase() + (data.badge.commissionRate != null ? '  ·  ' + data.badge.commissionRate + '%' : '')
  ctx.font = '700 ' + (2.3 * m) + 'px Arial, sans-serif'
  const badgeTextW = ctx.measureText(badgeText).width
  const badgeW = badgeTextW + 8 * m, badgeH = 4 * m
  roundRectPath(ctx, infoX, badgeY, badgeW, badgeH, badgeH / 2)
  ctx.fillStyle = BG_SOFT
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = 1
  roundRectPath(ctx, infoX, badgeY, badgeW, badgeH, badgeH / 2)
  ctx.stroke()
  drawStar(ctx, infoX + 3 * m, badgeY + badgeH / 2, 1.6 * m, GOLD)
  ctx.fillStyle = NAVY
  ctx.textAlign = 'left'
  ctx.fillText(badgeText, infoX + 6 * m, badgeY + badgeH / 2 + 0.8 * m)

  try {
    const qrImg = await loadImage(qrDataUrl)
    const wasSmooth = ctx.imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrImg, CANVAS_W - 15 * m, CANVAS_H - 15 * m, 12 * m, 12 * m)
    ctx.imageSmoothingEnabled = wasSmooth
  } catch {}

  return canvas
}

async function buildPdf(data: any, qrDataUrl: string): Promise<jsPDF> {
  const rep = data.representative
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [CARD_W_MM, CARD_H_MM] })

  pdf.setFillColor(255, 255, 255)
  pdf.rect(0, 0, CARD_W_MM, CARD_H_MM, 'F')
  pdf.setFillColor(11, 31, 58)
  pdf.rect(0, 0, CARD_W_MM, 11, 'F')

  if (data.logoUrl) {
    try {
      const logoDataUrl = await cropToDataUrl(data.logoUrl, 300, 300, 'contain')
      pdf.addImage(logoDataUrl, 'PNG', 3, 2, 7, 7, undefined, 'FAST')
    } catch {}
  }
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('EDUXELLENCE SOLUTIONS', 12, 5.5)
  pdf.setTextColor(244, 180, 0)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(6.5)
  pdf.text(rep.designation.toUpperCase(), 12, 8.8)

  const photoBox = { x: 3, y: 14, w: 22, h: 27 }
  if (data.photoUrl) {
    try {
      const photoDataUrl = await cropToDataUrl(data.photoUrl, 440, 540, 'cover')
      pdf.addImage(photoDataUrl, 'PNG', photoBox.x, photoBox.y, photoBox.w, photoBox.h, undefined, 'FAST')
    } catch {}
  }
  pdf.setDrawColor(20, 100, 244)
  pdf.setLineWidth(0.4)
  pdf.roundedRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, 1.5, 1.5, 'S')

  const infoX = 28
  pdf.setTextColor(23, 32, 51)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(rep.fullName, infoX, 18)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(7.5)
  pdf.setTextColor(75, 85, 104)
  pdf.text('Rep ID: ' + rep.referralCode, infoX, 23)

  const st = statusColor(rep.status)
  const sBg = st.bg.match(/\w\w/g)!.map(h => parseInt(h, 16))
  pdf.setFillColor(sBg[0], sBg[1], sBg[2])
  pdf.roundedRect(infoX, 25.5, 15, 4.5, 2.25, 2.25, 'F')
  const sTx = st.text.match(/\w\w/g)!.map(h => parseInt(h, 16))
  pdf.setTextColor(sTx[0], sTx[1], sTx[2])
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.text(st.label, infoX + 7.5, 28.4, { align: 'center' })

  const badgeText = data.badge.label.toUpperCase() + (data.badge.commissionRate != null ? '  ·  ' + data.badge.commissionRate + '%' : '')
  pdf.setFontSize(6.5)
  const badgeTextW = pdf.getTextWidth(badgeText)
  pdf.setFillColor(244, 247, 251)
  pdf.setDrawColor(244, 180, 0)
  pdf.roundedRect(infoX, 31, badgeTextW + 8, 4.5, 2.25, 2.25, 'FD')
  pdf.setFillColor(244, 180, 0)
  pdf.circle(infoX + 2.5, 33.25, 0.9, 'F')
  pdf.setTextColor(11, 31, 58)
  pdf.text(badgeText, infoX + 5.5, 33.6)

  pdf.addImage(qrDataUrl, 'PNG', CARD_W_MM - 14, CARD_H_MM - 14, 11, 11, undefined, 'FAST')

  pdf.setDrawColor(216, 222, 232)
  pdf.setLineWidth(0.3)
  pdf.roundedRect(0.5, 0.5, CARD_W_MM - 1, CARD_H_MM - 1, 2, 2, 'S')

  pdf.addPage([CARD_W_MM, CARD_H_MM], 'landscape')
  pdf.setFillColor(244, 247, 251)
  pdf.rect(0, 0, CARD_W_MM, CARD_H_MM, 'F')
  pdf.setDrawColor(11, 31, 58)
  pdf.setLineWidth(0.6)
  pdf.rect(0, 0, CARD_W_MM, CARD_H_MM, 'S')

  pdf.setTextColor(11, 31, 58)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7)
  pdf.text('ABOUT THIS CARD', 5, 7)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.5)
  pdf.setTextColor(23, 32, 51)
  const aboutText = "This identification card confirms that the bearer is an authorized Eduxellence Solutions Representative / Business Development Partner and is permitted to introduce Eduxellence products and services to prospective schools and organizations, subject to the company's representative terms and conditions."
  const lines = pdf.splitTextToSize(aboutText, 48)
  pdf.text(lines, 5, 11)

  let y = 11 + lines.length * 3 + 3
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.text('VERIFICATION', 5, y)
  y += 4
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(5.8)
  pdf.text('Representative ID:', 5, y); pdf.text(rep.referralCode, 26, y); y += 3.5
  if (rep.issuedOn) {
    pdf.text('Issue Date:', 5, y); pdf.text(new Date(rep.issuedOn).toLocaleDateString('en-GB'), 26, y); y += 3.5
  }
  pdf.text('Valid:', 5, y); pdf.text('WHILE ACTIVE', 26, y); y += 3.5
  pdf.text('Status:', 5, y); pdf.text(st.label, 26, y)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(5.5)
  pdf.setTextColor(20, 100, 244)
  pdf.text('SCAN TO VERIFY REPRESENTATIVE', CARD_W_MM - 24, 6, { align: 'center' })
  pdf.addImage(qrDataUrl, 'PNG', CARD_W_MM - 32, 8, 16, 16, undefined, 'FAST')

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(4.8)
  pdf.setTextColor(75, 85, 104)
  pdf.text('Verify this Representative:', CARD_W_MM - 40, 27)
  pdf.setFontSize(4.5)
  const bareUrl = data.verifyUrl.replace('https://', '').replace('http://', '')
  pdf.text(bareUrl, CARD_W_MM - 40, 30, { maxWidth: 32 })

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(6)
  pdf.setTextColor(11, 31, 58)
  pdf.text('EDUXELLENCE SOLUTIONS', CARD_W_MM / 2, CARD_H_MM - 6, { align: 'center' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(4.5)
  pdf.setTextColor(75, 85, 104)
  pdf.text('Official digital solutions for schools and organizations.', CARD_W_MM / 2, CARD_H_MM - 3.5, { align: 'center' })

  return pdf
}

export default function IdCardGenerator({ apiUrl = '/api/representatives/id-card' }: { apiUrl?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch(apiUrl).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [apiUrl])

  useEffect(() => {
    if (!data?.eligible || !qrRef.current) return
    const qrDataUrl = qrRef.current.toDataURL('image/png')
    renderFrontCanvas(data, qrDataUrl).then(canvas => setPreviewUrl(canvas.toDataURL('image/png')))
  }, [data])

  function downloadPng() {
    if (!previewUrl || !data) return
    const link = document.createElement('a')
    link.download = 'eduxellence-id-' + data.representative.referralCode + '.png'
    link.href = previewUrl
    link.click()
  }

  async function downloadPdf() {
    if (!data || !qrRef.current) return
    setBusy(true)
    try {
      const qrDataUrl = qrRef.current.toDataURL('image/png')
      const pdf = await buildPdf(data, qrDataUrl)
      pdf.save('eduxellence-id-' + data.representative.referralCode + '.pdf')
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
        <QRCodeCanvas ref={qrRef as any} value={data.verifyUrl} size={512} level="M" />
      </div>

      {previewUrl ? (
        <img
          src={previewUrl} alt="Representative ID Card"
          style={{ width: '342px', height: '216px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(11,31,58,0.15)' }}
        />
      ) : (
        <div style={{ width: '342px', height: '216px' }} className="flex items-center justify-center">
          <Loader2 className="animate-spin" size={20} />
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={downloadPng} disabled={!previewUrl} className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <Download size={14} /> Digital Image
        </button>
        <button onClick={downloadPdf} disabled={!previewUrl || busy} className="btn-primary btn-sm btn flex items-center gap-1.5">
          <FileDown size={14} /> {busy ? 'Preparing…' : 'Download PDF (Front + Back)'}
        </button>
      </div>
      <p className="text-xs text-ink-faint text-center max-w-xs">
        Print-ready PDF at true ID-card size, two pages — front and back.
      </p>
    </div>
  )
}