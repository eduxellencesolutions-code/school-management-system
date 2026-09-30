// FILE: src/app/(dashboard)/settings/branding/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateBranding } from './actions'

const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export default function BrandingSettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const success = searchParams.get('success')

  const [allowed, setAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [org, setOrg] = useState<{ name: string; logo_url: string | null; colors: { primary?: string; secondary?: string } | null } | null>(null)

  // Live form state — the preview reads from THESE, not the loaded values,
  // so it updates immediately on every change with no save/reload needed.
  const [primary, setPrimary] = useState('#1a56db')
  const [secondary, setSecondary] = useState('#0f766e')
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      router.replace('/dashboard')
      return
    }

    const isAdmin = profile.role === 'admin'
    let canManageBranding = isAdmin
    if (!isAdmin) {
      const { data } = await supabase.rpc('has_permission', {
        p_user_id: user.id,
        p_permission_key: 'institution.manage_branding',
      })
      canManageBranding = !!data
    }
    if (!canManageBranding) {
      router.replace('/dashboard')
      return
    }
    setAllowed(true)

    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, logo_url, colors')
      .eq('id', profile.organization_id)
      .single()

    setOrg(orgData)
    setPrimary(isValidHexColor(orgData?.colors?.primary ?? '') ? orgData!.colors!.primary! : '#1a56db')
    setSecondary(isValidHexColor(orgData?.colors?.secondary ?? '') ? orgData!.colors!.secondary! : '#0f766e')
    setLogoPreviewUrl(orgData?.logo_url ?? null)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => {
    load()
  }, [load])

  // Revoke any object URL created for a local file preview when the
  // component unmounts or a new file replaces it, to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl)
    }
  }, [logoPreviewUrl])

  function handlePrimaryChange(value: string) {
    // Invalid/incomplete input (e.g. mid-typing "#1a5") never crashes the
    // page or breaks the preview — it just doesn't update the swatch until
    // the value is a complete, valid hex color again.
    setPrimary(value)
  }

  function handleSecondaryChange(value: string) {
    setSecondary(value)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setLogoError(null)
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setLogoError('Logo must be a PNG, JPEG, or WebP image.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('Logo file must be under 2MB.')
      e.target.value = ''
      return
    }

    // Immediate local preview via object URL — no upload has happened yet.
    if (logoPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(logoPreviewUrl)
    setLogoPreviewUrl(URL.createObjectURL(file))
  }

  const previewPrimary = isValidHexColor(primary) ? primary : '#1a56db'
  const previewSecondary = isValidHexColor(secondary) ? secondary : '#0f766e'

  if (loading) {
    return <p className="text-sm text-ink-faint">Loading…</p>
  }

  if (!allowed || !org) {
    return null
  }

  return (
    <div className="max-w-lg">
      <h1 className="page-title mb-1">Branding</h1>
      <p className="page-subtitle mb-6">
        This appears on your institution's login page and portal whenever visitors
        arrive through your domain.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-red-700">{decodeURIComponent(error)}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-green-700">{decodeURIComponent(success)}</p>
        </div>
      )}

      <form action={updateBranding} className="card p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-ink mb-1">Logo</label>
          <input
            ref={fileInputRef}
            type="file"
            name="logo_file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelect}
            className="input"
          />
          <p className="text-xs text-ink-faint mt-1">
            PNG, JPEG, or WebP. Under 2MB. Square images work best.
          </p>
          {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink mb-1">Primary color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={previewPrimary}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="w-10 h-10 rounded border border-surface-200 cursor-pointer"
              />
              <input
                type="text"
                name="primary_color"
                value={primary}
                onChange={(e) => handlePrimaryChange(e.target.value)}
                className="input flex-1 font-mono text-sm"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-ink mb-1">Secondary color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={previewSecondary}
                onChange={(e) => handleSecondaryChange(e.target.value)}
                className="w-10 h-10 rounded border border-surface-200 cursor-pointer"
              />
              <input
                type="text"
                name="secondary_color"
                value={secondary}
                onChange={(e) => handleSecondaryChange(e.target.value)}
                className="input flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg p-4 border border-surface-200 flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${previewPrimary}14, ${previewSecondary}14)` }}
        >
          {logoPreviewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreviewUrl} alt="Logo preview" className="w-12 h-12 rounded object-contain bg-white" />
          )}
          <div>
            <p className="text-xs text-ink-faint mb-1">Preview</p>
            <p className="text-lg font-bold" style={{ color: previewPrimary }}>
              {org.name}
            </p>
            <p className="text-xs text-ink-muted">Powered by Eduxellence Results</p>
          </div>
        </div>

        <button type="submit" className="btn-primary btn w-fit">Save branding</button>
      </form>
    </div>
  )
}