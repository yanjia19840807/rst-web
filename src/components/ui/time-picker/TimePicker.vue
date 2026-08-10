<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { computed } from 'vue'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    disabled?: boolean
    /** Native time input step in seconds. Default 60 (minute precision). */
    step?: number | string
    placeholder?: string
    ariaLabel?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: '',
    disabled: false,
    step: 60,
    placeholder: undefined,
    ariaLabel: 'Choose time',
    class: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const minutePrecision = computed(() => Number(props.step) >= 60)

function toInputValue(value: string) {
  if (!value) return ''
  const [hours = '00', minutes = '00', seconds = '00'] = value.split(':')
  if (minutePrecision.value) return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

function fromInputValue(value: string) {
  if (!value) return ''
  const [hours = '00', minutes = '00', seconds = '00'] = value.split(':')
  if (minutePrecision.value) {
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`
  }
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`
}

const localValue = computed({
  get: () => toInputValue(props.modelValue ?? ''),
  set: (value: string | number) => emit('update:modelValue', fromInputValue(String(value))),
})
</script>

<template>
  <Input
    v-model="localValue"
    type="time"
    :step="step"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :placeholder="placeholder"
    :class="cn('bg-card', props.class)"
  />
</template>
