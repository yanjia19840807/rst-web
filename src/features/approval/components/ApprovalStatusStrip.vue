<script setup lang="ts">
import type { ApprovalStatusBar } from '../types'

defineProps<{
  bar: ApprovalStatusBar
}>()
</script>

<template>
  <div class="rounded-md border bg-muted/30 px-3 py-2 text-sm">
    <span class="font-medium">{{ bar.label }}</span>
    <template v-if="bar.step">
      <span class="text-muted-foreground"> · </span>
      <span>{{ bar.step }}</span>
    </template>
    <template v-if="bar.reviewer">
      <span class="text-muted-foreground"> · </span>
      <span>{{ bar.reviewer }}</span>
    </template>
  </div>
</template>
