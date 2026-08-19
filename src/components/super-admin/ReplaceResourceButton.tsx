'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ReplaceResourceButton({ resource, onDone }: { resource: any; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [version, setVersion] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleReplace() {
    if (!file) { setError('Select a replacement file'); return }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const path = `resources/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('representative-resources').upload(path, file)
      if (uploadError) throw uploadError

      const res = await fetch(`/api/platform-staff/resources/${resource.id}/replace`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storagePath: path, fileSizeBytes: file.size, mimeType: file.type, version: version || null }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      setOpen(false); setFile(null); setVersion('')
      onDone()
    } catch (err: any) {
      setError(err.message ?? 'Replace failed')
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs text-indigo-600 font-medium">Replace</button>
  }

  return (
    <div className="absolute right-4 mt-1 z-10 bg-white border rounded-lg shadow-lg p-3 space-y-2 w-64">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-ink-muted">New file replaces "{resource.title}" as draft; old version is archived.</p>
      <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-xs w-full" />
      <input placeholder="New version (optional)" value={version} onChange={e => setVersion(e.target.value)} className="w-full border rounded px-2 py-1 text-xs" />
      <div className="flex gap-2">
        <button onClick={handleReplace} disabled={uploading} className="btn-primary btn-sm btn text-xs disabled:opacity-50">
          {uploading ? 'Replacing…' : 'Confirm Replace'}
        </button>
        <button onClick={() => setOpen(false)} className="btn-sm btn text-xs">Cancel</button>
      </div>
    </div>
  )
}