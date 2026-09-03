<script setup lang="ts">
import { NativeSelect } from '@/components/ui/native-select'

import { pickerSelectClass, pickerSelectIconWrapClass } from './styles'

defineProps<{
  modelValue: string
  display: string
  ariaLabel: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div :class="pickerSelectIconWrapClass">
    <div class="relative">
      <div class="pointer-events-none absolute inset-0 flex h-full items-center pl-2 text-sm">
        {{ display }}
      </div>
      <NativeSelect
        :class="pickerSelectClass"
        :model-value="modelValue"
        :aria-label="ariaLabel"
        @update:model-value="emit('update:modelValue', String($event ?? ''))"
      >
        <slot />
      </NativeSelect>
    </div>
  </div>
</template>
