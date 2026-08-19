'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import ReplaceResourceButton from './ReplaceResourceButton'
import CategoryManager from './CategoryManager'

export default function ResourceManager() {
  const [resources, setResources] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [r, c] = await Promise.all([
      fetch('/api/platform-staff/resources').then(r => r.json()),
      fetch('/api/platform-staff/resource-categories').then(r => r.json()),
    ])
    setResources(r.resources ?? [])
    setCategories(c.categories ?? [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function handleUpload() {
    if (!title || !file) { setError('Title and file are required'); return }
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `resources/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('representative-resources').upload(path, file)
      if (uploadError) throw uploadError

      const resourceType = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type === 'application/pdf' ? 'pdf' : 'doc'

      const res = await fetch('/api/platform-staff/resources', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, description, categoryId: categoryId || null,
          resourceType, storagePath: path, fileSizeBytes: file.size, mimeType: file.type,
        }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)

      setTitle(''); setDescription(''); setCategoryId(''); setFile(null); setShowForm(false)
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function setStatus(id: string, status: string) {
    const res = await fetch(`/api/platform-staff/resources/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
  }

  async function setFlag(id: string, field: 'is_featured' | 'is_important', value: boolean) {
    const res = await fetch(`/api/platform-staff/resources/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    })
    const json = await res.json()
    if (json.error) alert(json.error)
    else load()
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>

  return (
    <div className="space-y-4">
      <CategoryManager onChange={load} />
      <button onClick={() => setShowForm(s => !s)} className="btn-primary btn-sm btn">+ Upload Resource</button>

      {showForm && (
        <div className="card p-4 space-y-3">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
            <option value="">No category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <button onClick={handleUpload} disabled={uploading} className="btn-primary btn-sm btn disabled:opacity-50">
            {uploading ? 'Uploading…' : 'Upload (as Draft)'}
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-50 border-b border-surface-200">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Resource</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Category</th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Status</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Downloads</th>
              <th className="text-center px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Flags</th>
              <th className="text-right px-4 py-2.5 text-xs font-semibold text-ink-muted uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {resources.map(r => (
              <tr key={r.id} className="border-b border-surface-100 relative">
                <td className="px-4 py-3 font-medium">{r.title}<div className="text-xs text-ink-faint">{r.resource_type}{r.version ? ` · v${r.version}` : ''}</div></td>
                <td className="px-4 py-3 text-ink-muted">{r.resource_categories?.label ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={
                    r.status === 'published' ? 'text-green-600 font-medium' :
                    r.status === 'archived' ? 'text-gray-400' : 'text-amber-600 font-medium'
                  }>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-center font-mono">{r.downloadCount}</td>
                <td className="px-4 py-3 text-center space-x-1">
                  <button
                    onClick={() => setFlag(r.id, 'is_featured', !r.is_featured)}
                    title="Toggle Featured"
                    className={`text-sm ${r.is_featured ? 'opacity-100' : 'opacity-25'}`}
                  >⭐</button>
                  <button
                    onClick={() => setFlag(r.id, 'is_important', !r.is_important)}
                    title="Toggle Important"
                    className={`text-sm ${r.is_important ? 'opacity-100' : 'opacity-25'}`}
                  >📌</button>
                </td>
                <td className="px-4 py-3 text-right space-x-2 relative">
                  {r.status === 'draft' && <button onClick={() => setStatus(r.id, 'published')} className="text-xs text-blue-600 font-medium">Publish</button>}
                  {r.status === 'published' && <button onClick={() => setStatus(r.id, 'draft')} className="text-xs text-amber-600 font-medium">Unpublish</button>}
                  {r.status !== 'archived' && <button onClick={() => setStatus(r.id, 'archived')} className="text-xs text-red-600 font-medium">Archive</button>}
                  {r.status !== 'archived' && <ReplaceResourceButton resource={r} onDone={load} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}