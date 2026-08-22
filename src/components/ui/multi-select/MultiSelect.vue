<script setup lang="ts">
import { computed } from 'vue'
import { ChevronDownIcon } from '@lucide/vue'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    options: string[]
    modelValue: string[]
    placeholder?: string
    disabled?: boolean
    emptyText?: string
    class?: string
  }>(),
  {
    placeholder: 'Select…',
    disabled: false,
    emptyText: 'No options available.',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const displayValue = computed(() => {
  if (!props.modelValue.length) return props.placeholder
  return props.modelValue.join(', ')
})

function isSelected(option: string) {
  return props.modelValue.includes(option)
}

const allSelected = computed(
  () => props.options.length > 0 && props.options.every((option) => isSelected(option)),
)

function toggle(option: string) {
  if (props.disabled) return
  emit(
    'update:modelValue',
    isSelected(option)
      ? props.modelValue.filter((item) => item !== option)
      : [...props.modelValue, option],
  )
}

function selectAll() {
  if (props.disabled) return
  emit('update:modelValue', [...props.options])
}

function clear() {
  if (props.disabled) return
  emit('update:modelValue', [])
}
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :disabled="disabled"
        :class="
          cn(
            'h-9 w-full justify-between px-3 font-normal',
            !modelValue.length && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <span class="min-w-0 flex-1 truncate text-left">{{ displayValue }}</span>
        <ChevronDownIcon class="size-4 shrink-0 text-muted-foreground" />
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-72 p-1.5">
      <div class="max-h-60 space-y-0.5 overflow-y-auto">
        <label
          v-for="option in options"
          :key="option"
          class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          :class="isSelected(option) ? 'bg-accent/70' : undefined"
        >
          <input
            type="checkbox"
            class="size-3.5 accent-primary"
            :checked="isSelected(option)"
            :disabled="disabled"
            @change="toggle(option)"
          />
          <span class="min-w-0 truncate">{{ option }}</span>
        </label>
        <p
          v-if="!options.length"
          class="px-2 py-3 text-center text-sm text-muted-foreground italic"
        >
          {{ emptyText }}
        </p>
      </div>
      <div
        v-if="options.length"
        class="mt-1 flex items-center justify-between gap-2 border-t px-2 pt-1.5 pb-0.5"
      >
        <button
          type="button"
          class="text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
          :disabled="disabled || allSelected"
          @click="selectAll"
        >
          Select all
        </button>
        <button
          type="button"
          class="text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
          :disabled="disabled || !modelValue.length"
          @click="clear"
        >
          Clear selection
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>
