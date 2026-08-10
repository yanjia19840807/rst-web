<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import NumberField from './NumberField.vue'
import NumberFieldContent from './NumberFieldContent.vue'
import NumberFieldDecrement from './NumberFieldDecrement.vue'
import NumberFieldIncrement from './NumberFieldIncrement.vue'
import NumberFieldInput from './NumberFieldInput.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    disabled?: boolean
    id?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: null,
    min: 0,
    step: 1,
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

function onUpdate(value: number | undefined) {
  emit(
    'update:modelValue',
    value == null || Number.isNaN(value) ? null : value,
  )
}
</script>

<template>
  <NumberField
    :id="id"
    :model-value="modelValue ?? undefined"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :class="props.class"
    @update:model-value="onUpdate"
  >
    <NumberFieldContent>
      <NumberFieldDecrement />
      <NumberFieldInput />
      <NumberFieldIncrement />
    </NumberFieldContent>
  </NumberField>
</template>
