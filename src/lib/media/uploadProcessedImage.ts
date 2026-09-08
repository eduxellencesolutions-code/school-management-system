import { createClient } from '@/lib/supabase/client';
import { IMAGE_PRESETS } from './imageProcessing';

const BUCKET_MAP: Record<keyof typeof IMAGE_PRESETS, string> = {
  studentPhoto: 'institution-assets',
  staffPhoto: 'institution-assets',
  schoolLogo: 'logos',
  signature: 'signatures',
}

export async function uploadProcessedImage(
  file: File,
  preset: keyof typeof IMAGE_PRESETS,
  organizationId: string,
  entityId: string
): Promise<{ success: boolean; url?: string; path?: string; error?: string }> {
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

  if (bucket === 'signatures') {
    // Private bucket — store the path, not a URL. A URL is generated
    // fresh at render time via getSignedSignatureUrl() below.
    return { success: true, path }
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { success: true, url: data.publicUrl }
}

export async function getSignedSignatureUrl(path: string, expirySeconds = 300): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.storage.from('signatures').createSignedUrl(path, expirySeconds)
  if (error || !data) return null
  return data.signedUrl
}