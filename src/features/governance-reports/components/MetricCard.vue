<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const props = defineProps<{
  label: string
  value: string
  hint?: string
  tone?: 'good' | 'bad' | 'warn' | 'neutral'
  valueClass?: HTMLAttributes['class']
}>()

const toneClass: Record<string, string> = {
  good: 'text-emerald-600',
  bad: 'text-destructive',
  warn: 'text-amber-600',
  neutral: 'text-foreground',
}
</script>

<template>
  <div class="flex h-full flex-col rounded-lg border bg-card px-3 py-2.5">
    <div class="text-xs text-muted-foreground">{{ label }}</div>
    <div
      :class="
        cn(
          'mt-1 font-semibold tracking-tight break-words',
          props.valueClass ?? 'text-lg',
          toneClass[tone ?? 'neutral'],
        )
      "
    >
      {{ value }}
    </div>
    <div v-if="hint" class="mt-auto pt-0.5 text-xs text-muted-foreground">{{ hint }}</div>
  </div>
</template>
