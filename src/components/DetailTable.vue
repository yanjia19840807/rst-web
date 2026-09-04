<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

export type DetailRow = {
  key?: string
  label: string
  value?: string | number | null
  strong?: boolean
}

const props = withDefaults(
  defineProps<{
    rows: DetailRow[]
    class?: HTMLAttributes['class']
    /** Field pairs per visual row. Default 1 keeps label | value stacked. */
    columns?: 1 | 2
  }>(),
  { columns: 1 },
)

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
        'grid text-sm',
        props.columns === 2
          ? 'grid-cols-1 gap-x-8 sm:grid-cols-2'
          : 'grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4',
        props.class,
      )
    "
  >
    <template v-if="props.columns === 2">
      <div
        v-for="row in rows"
        :key="slotName(row)"
        class="grid grid-cols-[minmax(5.5rem,max-content)_minmax(0,1fr)] gap-x-4"
      >
        <dt class="max-w-40 border-b py-2 pr-1 text-muted-foreground">{{ row.label }}</dt>
        <dd
          class="min-w-0 border-b py-2 break-words"
          :class="row.strong ? 'font-medium' : undefined"
        >
          <slot :name="slotName(row)" :row="row">
            {{ displayValue(row.value) }}
          </slot>
        </dd>
      </div>
    </template>
    <template v-else>
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
    </template>
  </dl>
</template>
