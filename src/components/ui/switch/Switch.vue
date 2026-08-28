<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
  class?: HTMLAttributes['class']
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="props.modelValue"
    :aria-label="props.label"
    :disabled="props.disabled"
    :data-state="props.modelValue ? 'checked' : 'unchecked'"
    :class="
      cn(
        'focus-visible:ring-ring/50 inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        props.class,
      )
    "
    @click="emit('update:modelValue', !props.modelValue)"
  >
    <span
      :data-state="props.modelValue ? 'checked' : 'unchecked'"
      class="pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5"
    />
  </button>
</template>
