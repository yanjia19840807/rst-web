<script setup lang="ts">
import type { DerivedHintLine } from '../periodWindows'

defineProps<{
  lines: DerivedHintLine[]
}>()
</script>

<template>
  <div
    class="mt-2 space-y-1 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs leading-relaxed"
  >
    <div v-for="line in lines" :key="line.label" class="grid gap-0.5 sm:grid-cols-[9rem_1fr] sm:gap-2">
      <div>
        <span class="font-medium text-foreground">{{ line.label }}</span>
        <span class="text-muted-foreground"> · {{ line.note }}</span>
      </div>
      <div class="font-medium text-foreground sm:text-right">{{ line.value }}</div>
    </div>
  </div>
</template>
