import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { GradingSystem } from '@/types'

// ─── Tailwind class merge ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Grading ─────────────────────────────────────────────────────────────────

export function getGrade(percentage: number, gradingSystem: GradingSystem[]): GradingSystem | null {
  return gradingSystem.find(
    (g) => percentage >= g.min_score && percentage <= g.max_score
  ) ?? null
}

// Default Nigerian grading (used as fallback before custom system is set)
export const DEFAULT_GRADING: GradingSystem[] = [
  { id: '1', organization_id: '', name: 'Default', grade_letter: 'A', min_score: 70, max_score: 100, remark: 'Excellent',   created_at: '' },
  { id: '2', organization_id: '', name: 'Default', grade_letter: 'B', min_score: 60, max_score: 69,  remark: 'Very Good',   created_at: '' },
  { id: '3', organization_id: '', name: 'Default', grade_letter: 'C', min_score: 50, max_score: 59,  remark: 'Good',        created_at: '' },
  { id: '4', organization_id: '', name: 'Default', grade_letter: 'D', min_score: 40, max_score: 49,  remark: 'Pass',        created_at: '' },
  { id: '5', organization_id: '', name: 'Default', grade_letter: 'E', min_score: 30, max_score: 39,  remark: 'Below Pass',  created_at: '' },
  { id: '6', organization_id: '', name: 'Default', grade_letter: 'F', min_score: 0,  max_score: 29,  remark: 'Fail',        created_at: '' },
]

// ─── Score calculations ───────────────────────────────────────────────────────

export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0
  return Math.round((score / maxScore) * 100 * 10) / 10
}

export function calculatePosition(scores: number[], targetScore: number): number {
  const sorted = [...scores].sort((a, b) => b - a)
  return sorted.indexOf(targetScore) + 1
}

export function assignPositions<T extends { total: number }>(items: T[]): (T & { position: number })[] {
  const sorted = [...items].sort((a, b) => b.total - a.total)
  return sorted.map((item, index) => ({ ...item, position: index + 1 }))
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return '-'
  return score % 1 === 0 ? score.toString() : score.toFixed(1)
}

export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

// ─── Plan limits helpers ──────────────────────────────────────────────────────

import { PLAN_LIMITS, type SubscriptionPlan } from '@/types'

export function canAddGroup(plan: SubscriptionPlan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].max_groups
  return limit === null || currentCount < limit
}

export function canAddLearner(plan: SubscriptionPlan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].max_learners
  return limit === null || currentCount < limit
}

export function planHasFeature(plan: SubscriptionPlan, feature: keyof typeof PLAN_LIMITS[SubscriptionPlan]): boolean {
  return !!PLAN_LIMITS[plan][feature]
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  const headers = Object.keys(data[0] ?? {})
  const rows = data.map((row) =>
    headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function generateLearnerCSVTemplate(): string {
  const headers = [
    'first_name',
    'last_name',
    'other_names',
    'admission_number',
    'gender',
    'date_of_birth',
    'guardian_name',
    'guardian_phone',
    'email',
  ]
  const example = [
    'Amara', 'Okafor', '', 'SS1/2026/001', 'F', '2010-03-15', 'Mr Okafor', '08012345678', '',
  ]
  return [headers.join(','), example.join(',')].join('\n')
}

// ─── Debounce ────────────────────────────────────────────────────────────────

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
