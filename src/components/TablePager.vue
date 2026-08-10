<script setup lang="ts">
import { computed } from 'vue'

import { Button } from '@/components/ui/button'

const props = defineProps<{
  total: number
  page: number
  pageSize: number
  label: string
}>()

const emit = defineEmits<{
  'update:page': [value: number]
  'update:pageSize': [value: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize) || 1))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.total, props.page * props.pageSize))

function prev() {
  if (props.page > 1) emit('update:page', props.page - 1)
}
function next() {
  if (props.page < totalPages.value) emit('update:page', props.page + 1)
}
</script>

<template>
  <div class="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
    <span>
      Showing {{ from }}–{{ to }} of {{ total }} {{ label }}
    </span>
    <div class="flex items-center gap-2">
      <label class="flex items-center gap-1.5 text-xs">
        Rows
        <select
          :value="pageSize"
          class="h-8 rounded-md border border-input bg-card px-2 text-sm text-foreground"
          @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
        </select>
      </label>
      <Button size="sm" variant="outline" :disabled="page <= 1" @click="prev">Prev</Button>
      <span class="text-xs">{{ page }} / {{ totalPages }}</span>
      <Button size="sm" variant="outline" :disabled="page >= totalPages" @click="next">Next</Button>
    </div>
  </div>
</template>
