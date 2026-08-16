import { Trophy } from 'lucide-react'

interface Props {
  slotNumber: number
  promoExpiresAt: string
}

export default function FoundingBadge({ slotNumber, promoExpiresAt }: Props) {
  const expiresDate = new Date(promoExpiresAt).toLocaleDateString('en-NG', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Trophy size={18} className="text-amber-600" />
        <span className="text-xs font-bold uppercase tracking-wide text-amber-700">
          Founding 500 School
        </span>
      </div>
      <p className="text-sm text-amber-900">
        Welcome to the Eduxellence Results Founding 500. You're among the first
        schools helping us build the future of digital school management.
      </p>
      <div className="flex items-center gap-4 mt-3 text-xs text-amber-700">
        <span className="font-medium">Founding School #{slotNumber}</span>
        <span>Founding access active until: {expiresDate}</span>
      </div>
    </div>
  )
}