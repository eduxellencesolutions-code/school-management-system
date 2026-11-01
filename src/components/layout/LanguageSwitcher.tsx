'use client'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LABELS: Record<string, string> = { en: 'English', fr: 'Français' }

export default function LanguageSwitcher({ supported = ['en', 'fr'] }: { supported?: string[] }) {
  const locale = useLocale()
  const router = useRouter()
  async function change(next: string) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`
    await createClient().rpc('set_my_locale', { p_locale: next })   // fails harmlessly for anonymous visitors and parents
    router.refresh()
  }
  return (
    <select className="input" value={locale} onChange={e => change(e.target.value)} aria-label="Language">
      {supported.map(l => <option key={l} value={l}>{LABELS[l] ?? l}</option>)}
    </select>
  )
}