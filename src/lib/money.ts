// src/lib/money.ts
export function formatMoney(amount: number | string | null | undefined, currency: string, locale = 'en'): string {
  if (amount === null || amount === undefined || amount === '') return '—'
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(amount))
}