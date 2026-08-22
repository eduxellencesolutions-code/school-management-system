// src/lib/media/uploadEscalationAttachment.ts
import { createClient } from '@/lib/supabase/client'

/**
 * Uploads a raw escalation attachment (screenshot, PDF, doc — no image
 * processing/resizing, unlike uploadProcessedImage) scoped under the
 * school's organization so files don't collide across schools, matching
 * the same path/upsert/return-shape conventions used elsewhere in media
 * uploads. Returns the public URL on success.
 */
export async function uploadEscalationAttachment(
  file: File,
  organizationId: string,
  ticketId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = createClient()
  const bucket = 'escalation-attachments'
  const extension = file.name.split('.').pop()
  const path = `${organizationId}/${ticketId}/${Date.now()}.${extension}`

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