import type { BadgeVariants } from '@/components/ui/badge'

export type StatusBadgeVariant = NonNullable<BadgeVariants['variant']>

const POSITIVE = new Set([
  'ACTIVE',
  'ENABLED',
  'APPROVED',
  'VALIDATED',
  'CONFIGURED',
  'SUBMITTED',
])

const NEGATIVE = new Set([
  'FAILED',
  'DISABLED',
  'RETURNED',
  'MISSING',
  'INACTIVE',
  'REVOKED',
  'DISCARDED',
])

/** Timesheet Sync Status tones: positive → secondary, negative → destructive, else outline. */
export function statusBadgeVariant(status?: string | null): StatusBadgeVariant {
  const key = status?.trim().toUpperCase()
  if (!key) return 'outline'
  if (POSITIVE.has(key)) return 'secondary'
  if (NEGATIVE.has(key)) return 'destructive'
  return 'outline'
}
