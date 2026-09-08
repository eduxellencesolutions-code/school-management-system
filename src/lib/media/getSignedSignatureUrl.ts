import { createClient } from '@/lib/supabase/server';

/**
 * Generate a signed URL for a signature image stored in the 'signatures' bucket.
 * Used in report card generation and anywhere signatures are displayed.
 * 
 * @param path - The file path in the 'signatures' bucket
 * @param expiresIn - Seconds until the signed URL expires (default: 3600 = 1 hour)
 * @returns The signed URL or null if the path is invalid
 */
export async function getSignedSignatureUrl(
  path: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('signatures')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Error generating signed URL for signature:', error.message);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (err) {
    console.error('Unexpected error generating signed URL:', err);
    return null;
  }
}