<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

export type DetailRow = {
  label: string
  value?: string | number | null
  strong?: boolean
}

const props = defineProps<{
  rows: DetailRow[]
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <dl :class="cn('grid grid-cols-[minmax(120px,0.7fr)_1fr] text-sm', props.class)">
    <template v-for="row in rows" :key="row.label">
      <dt class="border-b py-2 text-muted-foreground">{{ row.label }}</dt>
      <dd class="border-b py-2" :class="row.strong ? 'font-medium' : undefined">
        {{ row.value === 0 ? '0' : (row.value ?? '') || '—' }}
      </dd>
    </template>
  </dl>
</template>
