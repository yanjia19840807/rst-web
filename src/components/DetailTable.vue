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
  <dl
    :class="
      cn(
        'grid grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4 text-sm',
        props.class,
      )
    "
  >
    <template v-for="row in rows" :key="slotName(row)">
      <dt class="max-w-40 border-b py-2 pr-1 text-muted-foreground">{{ row.label }}</dt>
      <dd
        class="min-w-0 border-b py-2 break-words"
        :class="row.strong ? 'font-medium' : undefined"
      >
        <slot :name="slotName(row)" :row="row">
          {{ displayValue(row.value) }}
        </slot>
      </dd>
    </template>
  </dl>
</template>
