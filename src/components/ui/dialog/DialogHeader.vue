<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="dialog-header"
    :class="
      cn(
        // Bleed to dialog edges when DialogContent uses p-4; override with mx-0 mt-0 on p-0 dialogs.
        'flex flex-col gap-2 border-b bg-card -mx-4 -mt-4 rounded-t-xl px-4 py-3 text-left',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
