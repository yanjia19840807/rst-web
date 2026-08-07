<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const props = defineProps<{
  value?: string | number | null
  class?: HTMLAttributes['class']
  strong?: boolean
}>()
</script>

<template>
  <div
    :class="
      cn(
        'flex min-h-9 items-center text-sm leading-snug text-foreground',
        props.strong && 'font-semibold',
        props.class,
      )
    "
  >
    <slot>{{ value === 0 ? '0' : (value ?? '') || '—' }}</slot>
  </div>
</template>
