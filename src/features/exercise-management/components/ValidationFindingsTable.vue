<script setup lang="ts">
import StatusBadge from '@/components/StatusBadge.vue'
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
  const compared = finding.detail?.comparedMonths ?? 0
  const mismatchCount = finding.detail?.mismatches?.length ?? 0

  if (finding.ruleCode === 'DAILY_VS_MONTHLY') {
    if (reason === 'mismatch') {
      if (compared > 0 && mismatchCount > 0 && mismatchCount < compared) {
        return `${mismatchCount} of ${compared} overlapping months do not match`
      }
      if (mismatchCount > 0) {
        return `${mismatchCount} overlapping month${mismatchCount === 1 ? '' : 's'} do not match`
      }
      return reasonLabel.mismatch
    }
    if (reason === 'matched' && compared > 0) {
      return `${compared} overlapping month${compared === 1 ? '' : 's'} match`
    }
  }

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
          <TableCell>
            <StatusBadge :status="finding.severity" />
          </TableCell>
          <TableCell>
            <div>{{ findingDetail(finding) }}</div>
            <details v-if="mismatchesOf(finding).length" class="mt-1">
              <summary class="cursor-pointer text-xs text-muted-foreground">
                View {{ mismatchesOf(finding).length }}
                month{{ mismatchesOf(finding).length === 1 ? '' : 's' }}
              </summary>
              <div class="mt-2 max-h-64 min-w-0 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Daily</TableHead>
                      <TableHead>Monthly</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow
                      v-for="mismatch in mismatchesOf(finding)"
                      :key="mismatch.month"
                    >
                      <TableCell>{{ mismatch.month }}</TableCell>
                      <TableCell>{{ mismatch.daily }}</TableCell>
                      <TableCell>{{ mismatch.monthly }}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </details>
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
