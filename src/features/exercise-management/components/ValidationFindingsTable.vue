<script setup lang="ts">
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { formatTmsRatioPercent, TMS_RATIO_REASONS } from '../tmsRatio'
import type { ValidationFinding, ValidationRuleCode } from '../types'

defineProps<{
  findings: ValidationFinding[]
  emptyText?: string
}>()

const findingLabel: Record<ValidationRuleCode, string> = {
  DAILY_VS_MONTHLY: 'Daily total vs monthly total',
  TMS_RATIO: 'TMS ratio vs Daily volume',
}

const reasonLabel: Record<string, string> = {
  'both-empty': 'No monthly or daily actuals to compare',
  'monthly-empty': 'No monthly actuals to compare',
  'daily-empty': 'No daily actuals to compare',
  'no-overlap': 'No overlapping months to compare',
  matched: 'Overlapping months match',
  mismatch: 'Overlapping months do not match',
  ok: 'TMS ratio is at least 80%',
  'incomplete-coverage': 'Daily volume is missing for some dates in the TMS period',
  'below-threshold': 'TMS ratio is below 80%',
  'daily-volume-zero': 'Daily volume in the TMS period sums to 0',
}

function findingDetail(finding: ValidationFinding): string {
  const reason = finding.detail?.reason
  const label = reason && reasonLabel[reason] ? reasonLabel[reason] : (reason ?? '—')
  if (finding.ruleCode !== 'TMS_RATIO' || !finding.detail) return label
  const extras: string[] = []
  if (finding.detail.reason === TMS_RATIO_REASONS.incompleteCoverage) {
    const missing = finding.detail.missingDateCount
    if (missing != null) extras.push(`${missing} day${missing === 1 ? '' : 's'} without Daily volume`)
  }
  if (finding.detail.ratio != null) extras.push(formatTmsRatioPercent(finding.detail.ratio))
  return extras.length ? `${label} (${extras.join(', ')})` : label
}

function mismatchesOf(finding: ValidationFinding) {
  return finding.detail?.mismatches ?? []
}
</script>

<template>
  <div class="min-w-0 overflow-x-auto rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Check</TableHead>
          <TableHead class="w-28">Severity</TableHead>
          <TableHead>Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="finding in findings" :key="finding.ruleCode">
          <TableCell>{{ findingLabel[finding.ruleCode] ?? finding.ruleCode }}</TableCell>
          <TableCell>{{ finding.severity }}</TableCell>
          <TableCell>
            <div>{{ findingDetail(finding) }}</div>
            <ul
              v-if="mismatchesOf(finding).length"
              class="mt-1 space-y-0.5 text-xs text-muted-foreground"
            >
              <li v-for="mismatch in mismatchesOf(finding)" :key="mismatch.month">
                {{ mismatch.month }}: daily {{ mismatch.daily }} ≠ monthly
                {{ mismatch.monthly }}
              </li>
            </ul>
          </TableCell>
        </TableRow>
        <TableRow v-if="!findings.length">
          <TableCell colspan="3" class="text-muted-foreground">
            {{ emptyText || 'No validation findings returned.' }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
