<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

export type DetailRow = {
  key?: string
  label: string
  value?: string | number | null
  strong?: boolean
}

const props = defineProps<{
  rows: DetailRow[]
  class?: HTMLAttributes['class']
}>()

function displayValue(value: DetailRow['value']) {
  if (value === 0) return '0'
  return value == null || value === '' ? '—' : String(value)
}

function slotName(row: DetailRow) {
  return row.key ?? row.label
}
</script>

<template>
  <dl :class="cn('grid grid-cols-[minmax(120px,0.7fr)_1fr] text-sm', props.class)">
    <template v-for="row in rows" :key="slotName(row)">
      <dt class="border-b py-2 text-muted-foreground">{{ row.label }}</dt>
      <dd class="border-b py-2" :class="row.strong ? 'font-medium' : undefined">
        <slot :name="slotName(row)" :row="row">
          {{ displayValue(row.value) }}
        </slot>
      </dd>
    </template>
  </dl>
</template>
