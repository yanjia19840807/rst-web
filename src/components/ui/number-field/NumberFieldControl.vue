<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'

import NumberField from './NumberField.vue'
import NumberFieldContent from './NumberFieldContent.vue'
import NumberFieldInput from './NumberFieldInput.vue'

const props = withDefaults(
  defineProps<{
    modelValue?: number | null
    min?: number
    max?: number
    step?: number
    decimals?: number
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
    id?: string
    class?: HTMLAttributes['class']
  }>(),
  {
    modelValue: null,
    min: 0,
    decimals: 2,
    disabled: false,
    invalid: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const resolvedStep = computed(() => {
  if (props.step != null) return props.step
  return props.decimals === 0 ? 1 : 10 ** -props.decimals
})

const formatOptions = computed<Intl.NumberFormatOptions>(() => ({
  minimumFractionDigits: props.decimals,
  maximumFractionDigits: props.decimals,
}))

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
    :step="resolvedStep"
    :format-options="formatOptions"
    locale="en-US"
    :disabled="disabled"
    :class="props.class"
    @update:model-value="onUpdate"
  >
    <NumberFieldContent>
      <NumberFieldInput
        :aria-invalid="invalid || undefined"
        :placeholder="placeholder"
        :class="props.class"
      />
    </NumberFieldContent>
  </NumberField>
</template>
