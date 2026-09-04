<script setup lang="ts" generic="T extends string">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

defineProps<{
  tabs: readonly { key: T; label: string }[]
  modelValue: T
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()
</script>

<template>
  <div
    role="tablist"
    :class="
      cn(
        'flex w-0 min-w-full gap-1 overflow-x-auto overscroll-x-contain border-b touch-pan-x scrollbar-thin',
        $props.class,
      )
    "
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      role="tab"
      class="shrink-0 border-b-2 px-3.5 py-2 text-sm whitespace-nowrap transition-colors"
      :disabled="disabled"
      :aria-selected="modelValue === tab.key"
      :class="
        modelValue === tab.key
          ? 'border-primary font-semibold text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      "
      @click="emit('update:modelValue', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
