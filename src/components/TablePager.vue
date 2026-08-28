<script setup lang="ts">
import { computed } from 'vue'

import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    pageSize: number
    label: string
    class?: string
    hideSummary?: boolean
    linkButtons?: boolean
  }>(),
  {
    hideSummary: false,
    linkButtons: false,
  },
)

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
  <div
    :class="
      cn('mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground', props.class)
    "
  >
    <span v-if="!hideSummary">
      Showing {{ from }}–{{ to }} of {{ total }} {{ label }}
    </span>
    <div class="flex items-center gap-2" :class="hideSummary ? 'ml-auto' : undefined">
      <label class="flex items-center gap-1.5 text-xs">
        Rows
        <NativeSelect
          size="sm"
          :model-value="String(pageSize)"
          aria-label="Rows per page"
          @update:model-value="emit('update:pageSize', Number($event))"
        >
          <NativeSelectOption value="10">10</NativeSelectOption>
          <NativeSelectOption value="25">25</NativeSelectOption>
          <NativeSelectOption value="50">50</NativeSelectOption>
        </NativeSelect>
      </label>
      <Button
        size="sm"
        :variant="linkButtons ? 'link' : 'outline'"
        :class="linkButtons ? 'h-auto px-0' : undefined"
        :disabled="page <= 1"
        @click="prev"
      >
        Prev
      </Button>
      <span class="text-xs">{{ page }} / {{ totalPages }}</span>
      <Button
        size="sm"
        :variant="linkButtons ? 'link' : 'outline'"
        :class="linkButtons ? 'h-auto px-0' : undefined"
        :disabled="page >= totalPages"
        @click="next"
      >
        Next
      </Button>
    </div>
  </div>
</template>
