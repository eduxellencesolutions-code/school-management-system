'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload, X, ImageIcon } from 'lucide-react'
import { processImage, getPresetHelpText, IMAGE_PRESETS } from '@/lib/media/imageProcessing'
import toast from 'react-hot-toast'

interface Props {
  preset: keyof typeof IMAGE_PRESETS
  /** Called with the processed, ready-to-upload file. Caller decides where it goes. */
  onProcessed: (file: File) => void | Promise<void>
  /** Optional: show a live preview of the currently-selected/processed image */
  previewUrl?: string | null
  disabled?: boolean
}

export default function ImageUploadField({ preset, onProcessed, previewUrl, disabled }: Props) {
  const [processing, setProcessing] = useState(false)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const presetConfig = IMAGE_PRESETS[preset]

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessing(true)
    const result = await processImage(file, preset)
    setProcessing(false)

    if (!result.success || !result.file) {
      toast.error(result.error || 'Could not process this image')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    const objectUrl = URL.createObjectURL(result.file)
    setLocalPreview(objectUrl)
    await onProcessed(result.file)
  }

  function clearSelection() {
    setLocalPreview(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = localPreview ?? previewUrl

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded border border-surface-200 bg-surface-50 flex items-center justify-center overflow-hidden shrink-0">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayUrl} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-ink-faint" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="btn-secondary btn-sm btn flex items-center gap-1.5 cursor-pointer w-fit">
            {processing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {processing ? 'Processing…' : displayUrl ? 'Replace' : `Upload ${presetConfig.label}`}
            <input
              ref={inputRef}
              type="file"
              accept={presetConfig.acceptedFormats.join(',')}
              onChange={handleFileSelect}
              disabled={disabled || processing}
              className="hidden"
            />
          </label>
          {displayUrl && !processing && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs text-ink-faint hover:text-red-600 flex items-center gap-1 w-fit"
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-faint">{getPresetHelpText(preset)}</p>
    </div>
  )
}