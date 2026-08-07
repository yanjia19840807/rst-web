<script setup lang="ts">
import type { HTMLAttributes } from 'vue'

import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    :class="
      cn('mb-4 flex flex-wrap items-center justify-between gap-3', props.class)
    "
  >
    <div class="flex min-w-0 items-center gap-2">
      <slot name="left" />
    </div>
    <div class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2">
      <slot />
    </div>
  </div>
</template>
