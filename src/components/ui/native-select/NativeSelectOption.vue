<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  value?: string | number
  class?: HTMLAttributes['class']
  disabled?: boolean
}>()
</script>

<template>
  <option
    data-slot="native-select-option"
    :value="props.value"
    :disabled="disabled"
    :class="cn('bg-[Canvas] text-[CanvasText]', props.class)"
  >
    <slot />
  </option>
</template>
