import { createClient } from '@/lib/supabase/client'
import { IMAGE_PRESETS } from './imageProcessing'

const BUCKET_MAP: Record<keyof typeof IMAGE_PRESETS, string> = {
  studentPhoto: 'institution-assets',
  staffPhoto: 'institution-assets',
  schoolLogo: 'logos',
  signature: 'signatures',
}

/**
 * Uploads an already-processed file (from processImage) to the correct
 * bucket, scoped under the organization so files don't collide across
 * schools. Returns the public URL on success.
 */
export async function uploadProcessedImage(
  file: File,
  preset: keyof typeof IMAGE_PRESETS,
  organizationId: string,
  /** e.g. a learner id, staff id — used to make the path unique and stable for replacement */
  entityId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient()
  const bucket = BUCKET_MAP[preset]
  const extension = file.name.split('.').pop()
  const path = `${organizationId}/${preset}/${entityId}.${extension}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return { success: false, error: 'Upload failed. Please try again.' }
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { success: true, url: data.publicUrl }
}