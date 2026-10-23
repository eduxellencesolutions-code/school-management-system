// FILE: src/lib/results/transcriptFiles.tsx
import { flushSync } from 'react-dom'
import { saveAs } from 'file-saver'
import type { OfficialIssue } from './officialTranscriptPdf'

async function qrDataUrl(text: string): Promise<string | null> {
  try {
    const [{ createRoot }, { QRCodeCanvas }] = await Promise.all([import('react-dom/client'), import('qrcode.react')])
    const host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:-9999px;top:0;'
    document.body.appendChild(host)
    const root = createRoot(host)
    flushSync(() => root.render(<QRCodeCanvas value={text} size={240} marginSize={2} />))
    await new Promise(resolve => setTimeout(resolve, 150))
    const canvas = host.querySelector('canvas')
    const url = canvas ? canvas.toDataURL('image/png') : null
    root.unmount()
    host.remove()
    return url
  } catch {
    return null
  }
}

// The verification code is known only at the moment of issue. Pass it then, and the QR opens the check directly.
export async function downloadOfficialTranscript(issue: OfficialIssue, code?: string): Promise<void> {
  const origin = window.location.origin
  const verifyUrl = `${origin}/verify?ref=${encodeURIComponent(issue.reference)}${code ? `&code=${encodeURIComponent(code)}` : ''}`
  const qr = await qrDataUrl(verifyUrl)
  const [{ pdf }, { OfficialTranscriptDocument }] = await Promise.all([import('@react-pdf/renderer'), import('./officialTranscriptPdf')])
  const blob = await pdf(<OfficialTranscriptDocument issue={issue} verifyPage={`${origin}/verify`} qr={qr} codeIncluded={Boolean(code)} />).toBlob()
  saveAs(blob, `${issue.reference}_Official_Transcript.pdf`)
}