<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { NumberFieldInput } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    placeholder?: string
    size?: 'sm' | 'default'
  }>(),
  {
    size: 'default',
  },
)

const sizeClass = {
  default: 'h-9 rounded-lg px-2.5 py-1 text-base md:text-sm',
  sm: 'h-8 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem]',
} as const
</script>

<template>
  <NumberFieldInput
    data-slot="input"
    :placeholder="placeholder"
    :class="cn(
      'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border bg-card transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 w-full min-w-0 text-left outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      sizeClass[props.size],
      props.class,
    )"
  />
</template>
