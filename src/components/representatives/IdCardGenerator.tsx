'use client'
import { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Loader2, Download, Printer } from 'lucide-react'

export default function IdCardGenerator({ apiUrl = '/api/representatives/id-card' }: { apiUrl?: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const qrRef = useRef<HTMLCanvasElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(apiUrl).then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [apiUrl])

  async function downloadPng() {
    if (!data?.eligible || !qrRef.current) return
    setExporting(true)
    try {
      const qrDataUrl = qrRef.current.toDataURL('image/png')
      const width = 1013, height = 638
      const svg = buildCardSvg(data, qrDataUrl, width, height)
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        URL.revokeObjectURL(url)
        const link = document.createElement('a')
        link.download = `eduxellence-id-${data.representative.referralCode}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        setExporting(false)
      }
      img.onerror = () => {
        alert('Could not generate the image � this can happen if the photo or logo host does not allow cross-origin export. Try Print instead.')
        setExporting(false)
      }
      img.src = url
    } catch {
      setExporting(false)
    }
  }

  function print() {
    window.print()
  }

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

  if (!data?.eligible) {
    return (
      <div className="card p-6 max-w-md mx-auto text-center">
        <p className="font-semibold text-ink mb-2">ID Card unavailable</p>
        <p className="text-sm text-ink-muted mb-3">Your official Representative ID card cannot be generated yet.</p>
        <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3 text-left space-y-1">
          {data?.missing?.map((m: string, i: number) => <li key={i}>� {m}</li>)}
        </ul>
      </div>
    )
  }

  const rep = data.representative

  return (
    <div className="flex flex-col items-center gap-4">
      <div style={{ display: 'none' }}>
        <QRCodeCanvas ref={qrRef as any} value={data.verifyUrl} size={200} />
      </div>

      <div
        ref={cardRef}
        id="id-card-print-area"
        style={{
          width: '337.5px', height: '212.5px', borderRadius: '12px', overflow: 'hidden',
          background: 'linear-gradient(135deg, #ffffff 0%, #f4f6fb 100%)',
          border: '1px solid #d8dee8', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          position: 'relative', fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ background: '#111827', color: 'white', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {data.logoUrl && <img src={data.logoUrl} alt="" style={{ height: '18px', objectFit: 'contain' }} crossOrigin="anonymous" />}
          <span style={{ fontSize: '11px', fontWeight: 700 }}>EDUXELLENCE</span>
          <span style={{ fontSize: '9px', marginLeft: 'auto', opacity: 0.8 }}>Representative ID</span>
        </div>
        <div style={{ display: 'flex', padding: '10px 12px', gap: '10px' }}>
          {data.photoUrl && (
            <img
              src={data.photoUrl} alt={rep.fullName} crossOrigin="anonymous"
              style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e5e7eb', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>{rep.fullName}</p>
            <p style={{ fontSize: '10px', color: '#6b7280', margin: '2px 0' }}>{rep.designation}</p>
            <p style={{ fontSize: '9px', color: '#374151', margin: '4px 0 0', fontFamily: 'monospace' }}>ID: {rep.referralCode}</p>
            <span style={{ fontSize: '8px', background: '#ecfdf5', color: '#059669', padding: '2px 6px', borderRadius: '999px', display: 'inline-block', marginTop: '4px', fontWeight: 600 }}>
              {rep.status}
            </span>
          </div>
          <img src={qrRef.current?.toDataURL?.() ?? ''} alt="QR" style={{ width: '48px', height: '48px', flexShrink: 0 }} />
        </div>
        <div style={{ position: 'absolute', bottom: '6px', left: '12px', fontSize: '7px', color: '#9ca3af' }}>
          Issued {rep.issuedOn ? new Date(rep.issuedOn).toLocaleDateString('en-NG') : '�'}
        </div>
      </div>

      <div className="flex gap-2 no-print">
        <button onClick={downloadPng} disabled={exporting} className="btn-primary btn-sm btn flex items-center gap-1.5">
          <Download size={14} /> {exporting ? 'Preparing�' : 'Download ID Card'}
        </button>
        <button onClick={print} className="btn-secondary btn-sm btn flex items-center gap-1.5">
          <Printer size={14} /> Print ID Card
        </button>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #id-card-print-area, #id-card-print-area * { visibility: visible; }
          #id-card-print-area { position: fixed; top: 40px; left: 50%; transform: translateX(-50%); }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}

function buildCardSvg(data: any, qrDataUrl: string, width: number, height: number) {
  const rep = data.representative
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="24" fill="#ffffff" stroke="#d8dee8"/>
      <rect width="${width}" height="70" fill="#111827"/>
      <text x="70" y="45" fill="white" font-size="26" font-weight="700" font-family="system-ui">EDUXELLENCE</text>
      ${data.logoUrl ? `<image href="${data.logoUrl}" x="16" y="15" width="40" height="40"/>` : ''}
      <text x="${width - 20}" y="45" fill="white" font-size="18" text-anchor="end" opacity="0.8" font-family="system-ui">Representative ID</text>
      ${data.photoUrl ? `<image href="${data.photoUrl}" x="30" y="105" width="180" height="180" clip-path="inset(0 round 16)"/>` : ''}
      <text x="240" y="140" font-size="30" font-weight="700" fill="#111827" font-family="system-ui">${escapeXml(rep.fullName)}</text>
      <text x="240" y="175" font-size="20" fill="#6b7280" font-family="system-ui">${escapeXml(rep.designation)}</text>
      <text x="240" y="215" font-size="18" fill="#374151" font-family="monospace">ID: ${escapeXml(rep.referralCode)}</text>
      <rect x="240" y="235" width="200" height="30" rx="15" fill="#ecfdf5"/>
      <text x="255" y="255" font-size="16" fill="#059669" font-weight="600" font-family="system-ui">${escapeXml(rep.status)}</text>
      <image href="${qrDataUrl}" x="${width - 140}" y="100" width="100" height="100"/>
      <text x="30" y="${height - 20}" font-size="14" fill="#9ca3af" font-family="system-ui">Issued ${rep.issuedOn ? new Date(rep.issuedOn).toLocaleDateString('en-NG') : '�'}</text>
    </svg>
  `
}

function escapeXml(s: string) {
  return String(s ?? '').replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c] || c))
}
