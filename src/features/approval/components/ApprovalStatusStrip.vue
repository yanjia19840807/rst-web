<script setup lang="ts">
import { ownerViaLabel } from '@/lib/auditActor'

import type { ApprovalStatusBar } from '../types'

defineProps<{
  bar: ApprovalStatusBar
}>()

function reviewerText(bar: ApprovalStatusBar) {
  return ownerViaLabel(bar.reviewerBy) || bar.reviewer || ''
}
</script>

<template>
  <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <span class="font-medium">{{ bar.label }}</span>
    <template v-if="bar.step">
      <span class="text-muted-foreground"> · </span>
      <span>{{ bar.step }}</span>
    </template>
    <template v-if="reviewerText(bar)">
      <span class="text-muted-foreground"> · </span>
      <span>{{ reviewerText(bar) }}</span>
    </template>
  </div>
</template>
