export interface ImagePreset {
  key: string
  label: string
  acceptedFormats: string[] // MIME types
  maxWidth: number
  maxHeight: number
  maxFileSizeBytes: number
  /** Starting JPEG/WebP quality (0-1) before iterative compression kicks in */
  initialQuality: number
}

export const IMAGE_PRESETS: Record<string, ImagePreset> = {
  studentPhoto: {
    key: 'studentPhoto',
    label: 'Student Photo',
    acceptedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxWidth: 600,
    maxHeight: 600,
    maxFileSizeBytes: 200 * 1024,
    initialQuality: 0.85,
  },
  staffPhoto: {
    key: 'staffPhoto',
    label: 'Staff Photo',
    acceptedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    maxWidth: 600,
    maxHeight: 600,
    maxFileSizeBytes: 200 * 1024,
    initialQuality: 0.85,
  },
  schoolLogo: {
    key: 'schoolLogo',
    label: 'School Logo',
    acceptedFormats: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
    maxWidth: 1000,
    maxHeight: 1000,
    maxFileSizeBytes: 500 * 1024,
    initialQuality: 0.9,
  },
  signature: {
    key: 'signature',
    label: 'Signature',
    acceptedFormats: ['image/png'],
    maxWidth: 800,
    maxHeight: 300,
    maxFileSizeBytes: 100 * 1024,
    initialQuality: 0.9,
  },
}

export interface ProcessImageResult {
  success: boolean
  file?: File
  error?: string
}

function friendlyPresetDescription(preset: ImagePreset): string {
  const formats = preset.acceptedFormats
    .map(f => f.replace('image/', '').replace('jpeg', 'JPG').toUpperCase())
    .join(', ')
  const maxKb = Math.round(preset.maxFileSizeBytes / 1024)
  return `Accepted formats: ${formats}. Recommended up to ${preset.maxWidth}×${preset.maxHeight}px, ${maxKb}KB — larger images are automatically resized and compressed.`
}

export function getPresetHelpText(presetKey: keyof typeof IMAGE_PRESETS): string {
  return friendlyPresetDescription(IMAGE_PRESETS[presetKey])
}

/**
 * Validates format, resizes to fit within max dimensions (preserving aspect
 * ratio), compresses, and only rejects if the file is still over the size
 * cap after optimization. SVGs (logo preset) pass through unresized — canvas
 * rasterization would defeat the point of a vector logo — but are still
 * subject to the format and file-size checks.
 */
export async function processImage(
  file: File,
  presetKey: keyof typeof IMAGE_PRESETS
): Promise<ProcessImageResult> {
  const preset = IMAGE_PRESETS[presetKey]

  if (!preset.acceptedFormats.includes(file.type)) {
    return {
      success: false,
      error: `Unsupported format. ${friendlyPresetDescription(preset)}`,
    }
  }

  // SVGs can't be processed via canvas — just enforce the size cap directly.
  if (file.type === 'image/svg+xml') {
    if (file.size > preset.maxFileSizeBytes) {
      return {
        success: false,
        error: `SVG is too large (${Math.round(file.size / 1024)}KB). Maximum is ${Math.round(preset.maxFileSizeBytes / 1024)}KB.`,
      }
    }
    return { success: true, file }
  }

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) {
    return { success: false, error: 'This file could not be read as an image.' }
  }

  let { width, height } = bitmap
  if (width > preset.maxWidth || height > preset.maxHeight) {
    const scale = Math.min(preset.maxWidth / width, preset.maxHeight / height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return { success: false, error: 'Image processing is not supported in this browser.' }
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  const outputType = file.type === 'image/png' && presetKey === 'signature' ? 'image/png' : 'image/jpeg'

  // Iteratively step quality down until under the size cap, or give up
  // after a few attempts and reject rather than ship an over-limit file.
  let quality = preset.initialQuality
  let blob: Blob | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, outputType, quality)
    })
    if (!blob) break
    if (blob.size <= preset.maxFileSizeBytes) break
    quality -= 0.15
    if (quality < 0.3) break
  }

  if (!blob) {
    return { success: false, error: 'Failed to process this image. Try a different file.' }
  }

  if (blob.size > preset.maxFileSizeBytes) {
    return {
      success: false,
      error: `Even after compression, this image is ${Math.round(blob.size / 1024)}KB — over the ${Math.round(preset.maxFileSizeBytes / 1024)}KB limit for ${preset.label}. Try a smaller or simpler image.`,
    }
  }

  const extension = outputType === 'image/png' ? 'png' : 'jpg'
  const processedFile = new File(
    [blob],
    file.name.replace(/\.[^.]+$/, '') + `.${extension}`,
    { type: outputType }
  )

  return { success: true, file: processedFile }
}