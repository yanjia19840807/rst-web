<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'

import type { HTMLAttributes } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'
import { computed } from 'vue'
import { reactiveOmit, useVModel } from '@vueuse/core'
import { cn } from '@/lib/utils'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<{
  modelValue?: AcceptableValue | AcceptableValue[]
  class?: HTMLAttributes['class']
  size?: 'xs' | 'sm' | 'default'
  /** Empty-value label. Uses the shared muted placeholder color — do not restyle per field. */
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': AcceptableValue
}>()

const modelValue = useVModel(props, 'modelValue', emit, {
  passive: true,
  defaultValue: '',
})

const delegatedProps = reactiveOmit(props, 'class', 'size', 'modelValue', 'placeholder')

function classHas(token: string) {
  return typeof props.class === 'string' && props.class.split(/\s+/).includes(token)
}

const wrapperFull = computed(() => classHas('w-full'))
const wrapperFlex = computed(() => classHas('flex-1'))
const wrapperMinW0 = computed(() => classHas('min-w-0'))
const wrapperH8 = computed(() => classHas('h-8'))

const isEmptyValue = computed(() => {
  const value = modelValue.value
  if (value == null) return true
  if (Array.isArray(value)) return value.length === 0
  return String(value) === ''
})

const nativeSelectClass =
  'border-input text-foreground data-placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 dark:hover:bg-input/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 h-full w-full min-w-0 appearance-none rounded-lg border bg-card py-0 pr-8 pl-2.5 text-sm leading-none transition-colors select-none focus-visible:ring-3 aria-invalid:ring-3 data-[size=sm]:rounded-[min(var(--radius-md),10px)] data-[size=xs]:rounded-[min(var(--radius-md),10px)] data-[size=xs]:pr-6 data-[size=xs]:pl-2 data-[size=xs]:text-xs outline-none disabled:pointer-events-none disabled:cursor-not-allowed [&_option]:bg-[Canvas] [&_option:not([value=""])]:text-[CanvasText]'
</script>

<template>
  <div
    :class="
      cn(
        'group/native-select relative flex h-9 w-fit items-center has-[select:disabled]:opacity-50 data-[size=sm]:h-8 data-[size=xs]:h-6',
        wrapperFull && 'w-full',
        wrapperFlex && 'min-w-0 flex-1',
        wrapperMinW0 && 'min-w-0',
        wrapperH8 && 'h-8',
      )
    "
    data-slot="native-select-wrapper"
    :data-size="props.size ?? 'default'"
  >
    <select
      v-bind="{ ...$attrs, ...delegatedProps }"
      v-model="modelValue"
      data-slot="native-select"
      :data-placeholder="isEmptyValue ? '' : undefined"
      :data-size="props.size ?? 'default'"
      :class="cn(nativeSelectClass, props.class)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <slot />
    </select>
    <ChevronDownIcon
      class="text-muted-foreground top-1/2 right-2.5 size-4 -translate-y-1/2 pointer-events-none absolute select-none group-data-[size=xs]/native-select:right-1.5 group-data-[size=xs]/native-select:size-3"
      aria-hidden="true"
      data-slot="native-select-icon"
    />
  </div>
</template>
