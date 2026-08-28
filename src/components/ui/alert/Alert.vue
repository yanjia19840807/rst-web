<script setup lang="ts">
import { computed, type HTMLAttributes } from 'vue'
import type { AlertVariants } from '.'
import { cn } from '@/lib/utils'
import { alertVariants } from '.'

const props = defineProps<{
  class?: HTMLAttributes['class']
  variant?: AlertVariants['variant']
  role?: HTMLAttributes['role']
}>()

const resolvedRole = computed(() => {
  if (props.role) return props.role
  return props.variant === 'info' ? 'note' : 'alert'
})
</script>

<template>
  <div
    data-slot="alert"
    :data-variant="variant"
    :role="resolvedRole"
    :class="cn(alertVariants({ variant }), props.class)"
  >
    <slot />
  </div>
</template>
