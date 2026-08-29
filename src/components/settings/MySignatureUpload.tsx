'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateMySignature } from '@/app/(dashboard)/settings/profile/actions'
import toast from 'react-hot-toast'
import { Upload, X, Loader2 } from 'lucide-react'
import { getAuthenticatedUser } from '@/lib/supabase/authHelpers'

interface Props {
  currentSignatureUrl?: string | null
}

export default function MySignatureUpload({ currentSignatureUrl }: Props) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentSignatureUrl ?? null)

  async function handleUpload(file: File) {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, JPEG, GIF, SVG, or WEBP)')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Signature image must be less than 2MB')
      return
    }

    setUploading(true)
    try {
      const { user } = await getAuthenticatedUser(supabase)
      if (!user) throw new Error('Not logged in')
      
      // Generate unique file path
      const ext = file.name.split('.').pop()
      const path = `signatures/${user.id}/${Date.now()}.${ext}`
      
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(path, file, { 
          upsert: true,
          cacheControl: '3600',
        })
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        throw new Error(uploadError.message || 'Failed to upload image')
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('signatures')
        .getPublicUrl(path)
      
      // Update user profile with signature URL
      await updateMySignature(publicUrl)
      
      setPreview(publicUrl)
      toast.success('Signature updated — it will now appear on report cards for your classes')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload signature')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!preview) return
    
    setUploading(true)
    try {
      // Clear the signature URL in the database
      await updateMySignature('')
      
      setPreview(null)
      toast.success('Signature removed')
    } catch (error) {
      console.error('Remove error:', error)
      toast.error('Failed to remove signature')
    } finally {
      setUploading(false)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset the input so the same file can be re-uploaded
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Signature Preview */}
        <div className="w-48 h-24 rounded border border-surface-200 flex items-center justify-center overflow-hidden bg-surface-50 relative">
          {preview ? (
            <img 
              src={preview} 
              alt="Your signature" 
              className="w-full h-full object-contain p-1" 
            />
          ) : (
            <span className="text-xs text-ink-faint">No signature uploaded</span>
          )}
        </div>

        {/* Upload Button */}
        <label className="btn-secondary btn-sm btn cursor-pointer">
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? 'Uploading…' : 'Upload signature'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/svg+xml,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>

        {/* Remove Button */}
        {preview && (
          <button
            onClick={handleRemove}
            disabled={uploading}
            className="btn-secondary btn-sm btn text-red-600 hover:bg-red-50 border-red-200 disabled:opacity-50"
          >
            <X size={14} />
            Remove
          </button>
        )}
      </div>

      {/* Help Text */}
      <p className="text-xs text-ink-muted">
        Upload a clear image of your signature (PNG, JPG, JPEG, GIF, SVG, or WEBP, max 2MB). 
        The signature will appear on report cards for classes you teach.
      </p>
    </div>
  )
}