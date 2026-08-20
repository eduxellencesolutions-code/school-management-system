'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LogoUploadSettings() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/platform-staff/settings/logo')
    const json = await res.json()
    setLogoUrl(json.logo?.url ?? null)
  }
  useEffect(() => { load() }, [])

  async function handleUpload(file: File) {
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const path = `company/logo-${Date.now()}.${file.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const res = await fetch('/api/platform-staff/settings/logo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setLogoUrl(json.url)
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <h2 className="font-semibold text-sm text-ink">Company Logo</h2>
      {logoUrl && <img src={logoUrl} alt="Company logo" className="h-16 object-contain" />}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        type="file" accept="image/*" disabled={uploading}
        onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
        className="text-xs"
      />
      {uploading && <p className="text-xs text-ink-faint">Uploading�</p>}
    </div>
  )
}
